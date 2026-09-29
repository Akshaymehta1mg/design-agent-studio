import { streamText, generateText, tool, stepCountIs, type ModelMessage, type LanguageModel, type ToolChoice, type ToolSet } from "ai"
import { z } from "zod"
import type { ActionLog, Attachment, ChatMessage, Conversation, FrameNode, MessagePart, ProductLibrary } from "./types"
import { frameLabel, uid, useStore } from "./store"
import { getLanguageModel, type KeyedProvider } from "./providers"
import { addMarks, addNote, createWireframe, createWorkflow, figmaComment, iterateWireframe, type ActionResult } from "./canvas-actions"
import { addWorkflowPart, appendText, askUser, setPlan, upsertPart } from "./message-parts"
import { dataUrlParts } from "./files"
import { allDesignSystems, BUILTIN_DESIGN_SYSTEMS } from "./design-systems"
import { connectorTools } from "./mcp"
import { askUserInput, MAX_QUESTIONS, normalizeAsk } from "./ask-input"
import { loadPrismDoc, PRISM_ADAPTER, PRISM_CORE, PRISM_DOCS, RX_FALLBACK_IMAGE, searchDesignSystemReference, searchVisualResearch, TATA_1MG_ASSET_BASE, VISUAL_RESEARCH_URL, visualResearchPatterns } from "./prism"
import { DEVICE_SIZES } from "./wireframe"
import { imageForModel } from "./relay"
import { loadDesignReference, referenceIndex, referenceKeys, referenceSection } from "./design-reference"
import DS_ASSETS from "@/prism/design-system/assets.json"
import { hasFigmaAccess } from "./figma"
import { viaServer, type ServerUpstream } from "./server"

// ───────────────────────── model access ─────────────────────────

export const NO_MODEL = "No model is set up yet. Open Settings, add an API key, and pick a model."

/** The selected model, or null when no key or model is set up. */
export function currentModel(): { model: LanguageModel | null; label: string } {
  const { settings } = useStore.getState()
  const sel = settings.selectedModel
  const p = settings.providers[sel.provider as KeyedProvider]
  if (!sel.id || !p || (!p.apiKey && sel.provider !== "custom" && !viaServer(sel.provider as ServerUpstream))) return { model: null, label: sel.name }
  return { model: getLanguageModel(sel.provider as KeyedProvider, sel.id, p), label: sel.name }
}

// ───────────────────────── context ─────────────────────────

export function productContext(p: ProductLibrary): string {
  if (!p.useInConversations) return ""
  const parts = [
    p.about && `What it is: ${p.about}`,
    p.audience && `Who it's for: ${p.audience}`,
    p.goals && `Goals and metrics: ${p.goals}`,
    p.constraints && `Constraints: ${p.constraints}`,
    p.voice && `Voice and tone: ${p.voice}`,
  ].filter(Boolean)
  const screens = p.screens.filter((s) => s.summary)
  if (screens.length) parts.push(`Shipped screens the designer uploaded:\n${screens.map((s) => `- ${s.name}: ${s.summary}`).join("\n")}`)
  if (p.brief?.trim()) parts.push(`Brief:\n${p.brief.trim().slice(0, 8000)}`)
  for (const d of p.docs ?? []) parts.push(`Document "${d.name}":\n${d.text.slice(0, 12000)}`)
  return parts.join("\n\n")
}

export function designSystemFor(c: Conversation) {
  const { designSystems, defaultDesignSystemId } = useStore.getState()
  const id = c.designSystemId ?? defaultDesignSystemId
  return allDesignSystems(designSystems).find((d) => d.id === id) ?? BUILTIN_DESIGN_SYSTEMS[0]
}

function canvasInventory(c: Conversation): string {
  const frames = c.canvas.nodes.filter((n): n is FrameNode => n.kind === "frame")
  if (!frames.length) return "The canvas is empty."
  return frames
    .map((f) => {
      const marks = c.canvas.marks.filter((m) => m.frameId === f.id).length
      return `- id ${f.id} · ${f.type === "image" ? "screenshot" : f.type} · "${frameLabel(f)}" · ${f.w}×${f.h}${f.changeSummary ? ` · ${f.changeSummary}` : ""}${marks ? ` · ${marks} marks` : ""}`
    })
    .join("\n")
}

function latestPerLineage(c: Conversation): FrameNode[] {
  const byLineage = new Map<string, FrameNode>()
  for (const n of c.canvas.nodes) {
    if (n.kind !== "frame" || !n.lineageId || n.type !== "wireframe") continue
    const cur = byLineage.get(n.lineageId)
    if (!cur || (n.version ?? 0) > (cur.version ?? 0)) byLineage.set(n.lineageId, n)
  }
  return [...byLineage.values()]
}

/** Annotations, comments and notes only go on the canvas when the designer asks for them. */
const MARKUP_REQUEST = /annotat|critique|\bcrit\b|review|feedback|mark ?(it |this |them )?up|markup|\bmarks?\b|comment|audit|what do you think|what'?s wrong|issues?\b|problems?\b|\bnotes?\b|sticky/i
export const wantsMarkup = (text: string) => MARKUP_REQUEST.test(text)

export function systemPrompt(c: Conversation, product: ProductLibrary, opts: { figma: boolean; connectors?: string[]; markup?: boolean }): string {
  const ctx = productContext(product)
  const ds = designSystemFor(c)
  const mobile = ds.viewport ?? DEVICE_SIZES.mobile
  return `You are Prism, the design agent in Design Agent Studio, working with a designer on a shared canvas: screenshots, Figma exports and your own wireframes sit on it side by side. Prism core (below) governs how you work on every brief.

Studio rules
- Be specific and grounded in what you can see. No generic advice.
- Never annotate, comment on or add notes to the canvas unless the designer asks for critique, feedback, annotations or notes.
- Never ask the designer questions in plain chat text: every question goes through ask_user.

Canvas tools
- create_wireframe: a new screen or state that doesn't exist yet. Call it once per screen or essential state.
- iterate_wireframe: revise, try another version, apply feedback or explore a variant. This ALWAYS creates a new version next to the source (V2, V3…); you cannot edit an existing frame. Iterate from the latest version in a lineage unless the designer points at a specific one. You can also iterate from a screenshot.
${opts.markup ? `- annotate: mark regions of a frame (x, y, w, h as fractions 0–1 of the frame from its top-left). Keep each label under 30 words; lead with the problem.
- comment: a pinned point comment on a frame for a single, local remark.
- add_note: a sticky note on the canvas for summaries, rationale, open questions or next steps.
` : ""}- create_workflow: a user flow, journey, process or decision tree. Nodes are steps (kind start, step, decision or end); mark return paths as kind "loop". Keep titles short; put detail in description, content and footer.
- update_plan: for multi-step work, call it first with your plan, then as you go. Skip it for single quick actions.
- ask_user: every question, decision or approval. Put all questions for a moment in one call (up to ${MAX_QUESTIONS}), each with 2–4 short options and allowCustom. Without questions it becomes an approve / request changes / reject card. It waits for the answer.
- prism_reference, read_design_system, search_visual_research, view_visual_research: Prism's references, design system and visual research (see below).${opts.figma ? "\n- figma_comment: post a comment into the linked Figma file. Only when the designer asks for Figma comments, or when they've enabled it and you're giving critique on Figma frames." : ""}

Wireframe HTML
- Write an HTML fragment for the page body. No <script>, no external fonts, no <html>/<head>.
- Images: only the design system's approved asset URLs (read_design_system lists them) or supplied images. Otherwise use placeholders: <div class="wf-img" style="height:160px"></div>.
- Width is fixed by the device (mobile ${mobile.w}px, tablet 820px, desktop 1280px); design for that width. Use real, specific copy.
- Helper classes: wf-screen (root, full height column), wf-status (phone status bar), wf-bar + wf-title (top bar), wf-body (padded column), wf-footer (bottom action area), wf-row, wf-col, wf-grid, wf-between, wf-h1, wf-h2, wf-h3, wf-text, wf-muted, wf-label, wf-card, wf-fill, wf-divider, wf-img, wf-avatar, wf-icon, wf-btn, wf-btn-primary, wf-btn-block, wf-btn-sm, wf-input, wf-chip, wf-chip-on, wf-tag, wf-list, wf-scroll-x, wf-tabbar, wf-sheet, wf-handle, wf-note. Use inline styles to apply the design system's tokens (colours, type, spacing, radii) wherever the helpers don't match it.
- The canvas applies the design system's accent colour, radius and font to the helpers automatically.
${opts.connectors?.length ? `\nConnected tools\n- You can also use tools from: ${opts.connectors.join(", ")}. Tool names are prefixed with the connector.\n` : ""}
${PRISM_ADAPTER}

══════════ Prism core ══════════
${PRISM_CORE}
══════════ end of Prism core ══════════

Design system for this project: ${ds.name}${ds.referenceUrl ? " (component reference searchable with read_design_system)" : ""}
${ds.profile}

${ctx ? `Product context\n${ctx}\n\n` : ""}Canvas right now
${canvasInventory(c)}`
}

function frameParts(f: FrameNode, c: Conversation): ModelMessage["content"] {
  const marks = c.canvas.marks.filter((m) => m.frameId === f.id)
  const header = `[Frame ${f.id} · "${frameLabel(f)}" · ${f.type} · ${f.w}×${f.h}]${marks.length ? `\nExisting marks:\n${marks.map((m) => `  ${m.n}. (${m.type}, ${m.author}) ${m.text}`).join("\n")}` : ""}`
  if (f.type === "wireframe") {
    return [{ type: "text", text: `${header}\nHTML source:\n${(f.html ?? "").slice(0, 14000)}` }]
  }
  if (f.type === "workflow") {
    return [{ type: "text", text: `${header}\nWorkflow JSON:\n${JSON.stringify(f.workflow).slice(0, 8000)}` }]
  }
  const parts: Exclude<ModelMessage["content"], string> = [{ type: "text", text: header }]
  if (f.src) {
    const d = dataUrlParts(f.src)
    if (d) parts.push({ type: "image", image: d.base64, mediaType: d.mediaType } as never)
    else if (/^https?:/.test(f.src)) parts.push({ type: "image", image: new URL(f.src) } as never)
  }
  return parts as ModelMessage["content"]
}

function attachmentParts(atts: Attachment[], c: Conversation) {
  const parts: { type: string; [k: string]: unknown }[] = []
  for (const a of atts) {
    if (a.kind === "frame") {
      const f = c.canvas.nodes.find((n) => n.id === a.frameId)
      if (f?.kind === "frame") parts.push(...((frameParts(f, c) as unknown) as typeof parts))
    } else if (a.kind === "file") {
      if (a.text) parts.push({ type: "text", text: `[File: ${a.name}]\n${a.text.slice(0, 60000)}` })
      else if (a.dataUrl) {
        const d = dataUrlParts(a.dataUrl)
        if (!d) continue
        if (d.mediaType.startsWith("image/")) parts.push({ type: "image", image: d.base64, mediaType: d.mediaType })
        else parts.push({ type: "file", data: d.base64, mediaType: d.mediaType, filename: a.name })
      }
    } else if (a.kind === "figma") {
      parts.push({ type: "text", text: `[Linked Figma file: ${a.title} · ${a.url}]` })
    }
  }
  return parts
}

function toModelMessages(c: Conversation, current: ChatMessage): ModelMessage[] {
  const history = c.messages.filter((m) => m.id !== current.id && m.status !== "error" && (m.text.trim() || m.parts?.length)).slice(-16)
  const msgs: ModelMessage[] = history.map((m) => {
    if (m.role === "assistant") {
      const acts = m.actions?.length ? `\n[Canvas actions: ${m.actions.map((a) => a.label).join("; ")}]` : ""
      const asks = (m.parts ?? [])
        .filter((p) => p.type === "ask")
        .map((p) => (p.type === "ask" ? `\n[Asked: ${p.title} → ${p.result ?? p.status}]` : ""))
        .join("")
      return { role: "assistant", content: m.text + acts + asks }
    }
    const att = m.attachments?.filter((a) => a.kind === "frame").map((a) => (a as { title: string }).title)
    return { role: "user", content: m.text + (att?.length ? `\n[Attached: ${att.join(", ")}]` : "") }
  })
  const parts = attachmentParts(current.attachments ?? [], c)
  // If nothing is attached but the designer is iterating, give the model the latest wireframes' source.
  const iterating = /iterat|another|version|revis|variant|again|improve|tweak|change/i.test(current.text)
  if (!current.attachments?.some((a) => a.kind === "frame") && iterating) {
    for (const f of latestPerLineage(c).slice(-2)) parts.push(...((frameParts(f, c) as unknown) as typeof parts))
  }
  msgs.push({ role: "user", content: [...parts, { type: "text", text: current.text }] as never })
  return msgs
}

// ───────────────────────── tools ─────────────────────────

const deviceEnum = z.enum(["mobile", "tablet", "desktop"])

function canvasTools(convId: string, msgId: string, log: (r: ActionResult) => void, figma: boolean, markup: boolean, signal?: AbortSignal) {
  const loc = { convId, msgId }
  const wrap = (r: ActionResult) => {
    log(r)
    return r.message
  }
  const tools = {
    create_wireframe: tool({
      description: "Put a NEW wireframe on the canvas (version 1 of a new lineage).",
      inputSchema: z.object({
        title: z.string().describe("Short screen name, e.g. 'Checkout'"),
        device: deviceEnum.default("mobile"),
        summary: z.string().describe("One sentence on the idea behind this layout"),
        height: z.number().optional().describe("Page height in px if taller than one screen"),
        html: z.string().describe("HTML fragment using wf-* classes and inline styles"),
      }),
      execute: async (i) => wrap(createWireframe(convId, i)),
    }),
    iterate_wireframe: tool({
      description: "Create the NEXT VERSION of an existing frame as a new frame beside it. Never modifies the source.",
      inputSchema: z.object({
        source_frame_id: z.string(),
        change_summary: z.string().describe("What changed vs the source and why, one or two sentences"),
        title: z.string().optional(),
        device: deviceEnum.optional(),
        height: z.number().optional(),
        html: z.string().describe("Complete HTML for the new version"),
      }),
      execute: async (i) => wrap(iterateWireframe(convId, i)),
    }),
    create_workflow: tool({
      description: "Put an animated flow diagram on the canvas and in the chat.",
      inputSchema: z.object({
        title: z.string(),
        description: z.string().optional().describe("One sentence on what the flow covers"),
        nodes: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              description: z.string().optional().describe("Short subtitle"),
              content: z.string().optional().describe("What happens here, one line"),
              footer: z.string().optional().describe("Metadata: screen name, owner, metric, exit rate…"),
              kind: z.enum(["start", "step", "decision", "end"]).optional(),
            }),
          )
          .min(2)
          .max(14),
        edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional(), kind: z.enum(["main", "loop"]).optional() })),
      }),
      execute: async (wf) => {
        const r = createWorkflow(convId, wf)
        if (r.frameId) addWorkflowPart(loc, r.frameId, wf)
        return wrap(r)
      },
    }),
    update_plan: tool({
      description: "Show or update your task plan in the chat. Send the full list each time.",
      inputSchema: z.object({
        title: z.string().optional(),
        items: z.array(z.object({ title: z.string(), status: z.enum(["pending", "in-progress", "completed", "cancelled"]) })).min(1).max(10),
      }),
      execute: async ({ title, items }) => {
        setPlan(loc, title ?? "Plan", items)
        return `Plan updated: ${items.filter((i) => i.status === "completed").length}/${items.length} done.`
      },
    }),
    ask_user: tool({
      description: "Ask the designer for a decision or approval, and wait for the answer. The only way to ask the designer anything.",
      inputSchema: askUserInput,
      execute: async (input) => {
        const answer = await askUser(loc, normalizeAsk(input), signal)
        return `Designer's answer: ${answer}`
      },
    }),
  }
  const markupTools = {
    annotate: tool({
      description: "Mark regions on a frame with numbered annotations. Coordinates are fractions (0–1) of the frame.",
      inputSchema: z.object({
        frame_id: z.string(),
        annotations: z
          .array(
            z.object({
              x: z.number(),
              y: z.number(),
              w: z.number(),
              h: z.number(),
              text: z.string(),
              severity: z.enum(["critical", "major", "minor", "positive"]).default("minor"),
            }),
          )
          .min(1)
          .max(10),
      }),
      execute: async ({ frame_id, annotations }) => wrap(addMarks(convId, frame_id, annotations.map((a) => ({ ...a, type: "annotation" as const })))),
    }),
    comment: tool({
      description: "Pin a comment to a point on a frame (x, y fractions 0–1).",
      inputSchema: z.object({ frame_id: z.string(), x: z.number(), y: z.number(), text: z.string() }),
      execute: async ({ frame_id, ...c }) => wrap(addMarks(convId, frame_id, [{ ...c, type: "comment" }])),
    }),
    add_note: tool({
      description: "Place a sticky note on the canvas.",
      inputSchema: z.object({ title: z.string().optional(), text: z.string(), near_frame_id: z.string().optional() }),
      execute: async (i) => wrap(addNote(convId, i)),
    }),
  }
  const base = markup ? { ...tools, ...markupTools } : tools
  if (!figma) return base
  return {
    ...base,
    figma_comment: tool({
      description: "Post a comment to the linked Figma file, pinned to the frame's Figma node when known.",
      inputSchema: z.object({ message: z.string(), frame_id: z.string().optional() }),
      execute: async (i) => wrap(await figmaComment(convId, i)),
    }),
  }
}

// ───────────────────────── Prism: references, design system, visual research ─────────────────────────

function prismTools(convId: string) {
  return {
    prism_reference: tool({
      description: `Load one of Prism's reference documents by name. Available: ${PRISM_DOCS.join(", ")}.`,
      inputSchema: z.object({ name: z.string().describe("Reference name, e.g. 'product-thinking-gate' or 'wireframe'") }),
      execute: async ({ name }) => (await loadPrismDoc(name)) ?? `No Prism reference called "${name}". Available: ${PRISM_DOCS.join(", ")}.`,
    }),
    read_design_system: tool({
      description:
        "Read the project's design system (the Design systems page). No arguments: the guide, the list of reference sections and approved asset URLs. section: one reference section as structured specs, e.g. 'colors', 'typography', 'spacing', 'corner-radius', 'shadows', 'buttons', 'input-fields', 'chips', 'sku-cards', 'actionbar', 'page-header', 'labs-home'. query: search the raw component reference code for a key when a section isn't enough.",
      inputSchema: z.object({ section: z.string().optional(), query: z.string().optional() }),
      execute: async ({ section, query }) => {
        const c = useStore.getState().conversations.find((x) => x.id === convId)
        const ds = c ? designSystemFor(c) : BUILTIN_DESIGN_SYSTEMS[0]
        const hasReference = ds.id === "ds_tata1mg"
        if (section?.trim()) {
          if (!hasReference) return `${ds.name} has no reference sections. Use its guide instead.`
          return (await referenceSection(section)) ?? `No section "${section}". Sections: colors, ${(await referenceKeys()).join(", ")}.`
        }
        if (query?.trim()) {
          if (!ds.referenceUrl) return `${ds.name} has no component reference to search. Use its guide instead.`
          return searchDesignSystemReference(query, ds.referenceUrl)
        }
        const assets = ds.id === "ds_tata1mg" ? `\n\nApproved assets (use these URLs in <img>):\n${DS_ASSETS.map((a) => `- ${TATA_1MG_ASSET_BASE}${a}`).join("\n")}\nRX medicine fallback: ${RX_FALLBACK_IMAGE}` : ""
        const index = hasReference ? `\n\nReference sections (read one with section):\n${referenceIndex(await loadDesignReference())}` : ""
        return `Design system: ${ds.name}\n\n${ds.profile}${index}${assets}`
      },
    }),
    search_visual_research: tool({
      description:
        "Search the curated visual-research library (300 app screens, the Visual research page). Filter by pattern cluster and/or words describing the user job, information shape and state. Returns ids, patterns and descriptions; inspect the chosen ones with view_visual_research.",
      inputSchema: z.object({
        query: z.string().optional().describe("User job, information shape, state or unresolved element, e.g. 'compare plans recommended choice bottom sheet'"),
        pattern: z.string().optional().describe("A pattern cluster name or part of it, e.g. 'Comparison' or 'Onboarding'"),
        limit: z.number().optional(),
      }),
      execute: async ({ query, pattern, limit }) => {
        const found = await searchVisualResearch({ query, pattern, limit: Math.min(limit ?? 12, 20) })
        const clusters = (await visualResearchPatterns()).join("; ")
        if (!found.length) return `No references matched. Pattern clusters: ${clusters}. If nothing fits, record "no local fit".`
        return `${found.length} references (page: ${VISUAL_RESEARCH_URL}):\n${found
          .map((r) => `- ${r.id} · ${r.patterns.join(", ") || "unclustered"} · ${r.description}${r.visible_text ? ` · text: ${r.visible_text.slice(0, 120)}` : ""} · source: ${r.pin_url}`)
          .join("\n")}\n\nPattern clusters: ${clusters}`
      },
    }),
    view_visual_research: tool({
      description: "Look at up to five visual-research screenshots by id (e.g. ref-019) so you can decode them. Never infer a pattern without viewing it.",
      inputSchema: z.object({ ids: z.array(z.string()).min(1).describe("Up to five reference ids") }),
      execute: async ({ ids }) => {
        const refs = await searchVisualResearch({ ids: ids.slice(0, 5) })
        const images = await Promise.all(refs.map((r) => imageForModel(r.image)))
        return refs.map((r, i) => ({ id: r.id, source: r.pin_url, patterns: r.patterns, description: r.description, image: images[i] }))
      },
      toModelOutput: (items) => ({
        type: "content",
        value: items.flatMap((r) => [
          { type: "text" as const, text: `${r.id} · ${r.patterns.join(", ") || "unclustered"} · source ${r.source}${r.image ? "" : " · (image couldn't be loaded; don't infer its layout)"}` },
          ...(r.image ? [{ type: "media" as const, data: r.image.data, mediaType: r.image.mediaType }] : []),
        ]),
      }),
    }),
  }
}

// ───────────────────────── run a chat turn ─────────────────────────

let controller: AbortController | null = null
export function stopAgent() {
  controller?.abort()
}

const ACTIVITY: Record<string, string> = {
  create_wireframe: "Drawing a wireframe…",
  iterate_wireframe: "Drawing the next version…",
  annotate: "Marking up the frame…",
  comment: "Leaving a comment…",
  add_note: "Writing a note…",
  figma_comment: "Commenting in Figma…",
  create_workflow: "Mapping the flow…",
  update_plan: "Planning…",
  ask_user: "Preparing a question…",
  prism_reference: "Reading Prism's references…",
  read_design_system: "Checking the design system…",
  search_visual_research: "Searching visual research…",
  view_visual_research: "Looking at references…",
}

// ───────────────────────── questions in plain text → question card ─────────────────────────

type Loc = { convId: string; msgId: string }

const ASK_INSTEAD = `(Design Agent Studio) You asked questions in plain chat text. Ask them with ask_user instead: one call, at most ${MAX_QUESTIONS} questions, each with 2–4 short options and allowCustom. Merge related questions. Don't write anything else.`

const getMessage = (loc: Loc) => useStore.getState().conversations.find((c) => c.id === loc.convId)?.messages.find((m) => m.id === loc.msgId)

const textOf = (parts: MessagePart[]) =>
  parts
    .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n\n")

const isQuestionLine = (line: string) => /\?\s*$/.test(line.replace(/[*_)\]]+\s*$/, ""))

/** Two or more lines that end in a question mark: the model is asking, not offering a follow-up. */
export function looksLikeQuestions(text: string) {
  return text.split("\n").filter(isQuestionLine).length >= 2
}

/** Cut a trailing block of questions (and its lead-in heading or rule) out of the reply's last text part. */
export function cutQuestions(text: string) {
  const lines = text.split("\n")
  let i = lines.findIndex(isQuestionLine)
  if (i < 0) return text
  // Step back over the numbering, heading, rule or "I need to know:" line that introduces the questions.
  while (i > 0 && /^\s*$|^\s*(#{1,4}\s|[-*_]{3,}\s*$|\d+[.)]\s|[-*•]\s)|:\s*\**\s*$/.test(lines[i - 1])) i--
  return lines.slice(0, i).join("\n").trimEnd()
}

function trimQuestions(loc: Loc) {
  const parts = getMessage(loc)?.parts ?? []
  const last = [...parts].reverse().find((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
  if (last) upsertPart(loc, { ...last, text: cutQuestions(last.text) })
}

export async function runChat(convId: string, userMsg: ChatMessage) {
  let closeMcp = () => {}
  const store = useStore.getState()
  const { model, label } = currentModel()
  const assistantId = uid("c_")
  store.addMessage({ id: assistantId, role: "assistant", text: "", status: "streaming", model: label, actions: [], createdAt: Date.now(), activity: "Thinking…" }, convId)
  store.setBusy(true)
  const pushAction = (r: ActionResult) => {
    if (r.log) useStore.getState().patchMessage(assistantId, (m) => ({ actions: [...(m.actions ?? []), r.log as ActionLog] }), convId)
  }
  controller = new AbortController()
  try {
    if (!model) {
      throw new Error(NO_MODEL)
    } else {
      const c = useStore.getState().conversations.find((x) => x.id === convId)!
      const figmaOn = !!(c.figma?.allowComments && hasFigmaAccess(useStore.getState().settings.figmaToken))
      const markup = wantsMarkup(userMsg.text)
      const live = useStore.getState().connectors.filter((x) => x.enabled && x.status === "ok")
      if (live.length) useStore.getState().patchMessage(assistantId, { activity: "Connecting your tools…" }, convId)
      const mcp = live.length ? await connectorTools(live) : { tools: {}, close: () => {}, failed: [] as string[] }
      closeMcp = mcp.close
      const loc = { convId, msgId: assistantId }
      const tools: ToolSet = { ...mcp.tools, ...prismTools(convId), ...canvasTools(convId, assistantId, pushAction, figmaOn, markup, controller.signal) }
      const system = systemPrompt(c, useStore.getState().product, { figma: figmaOn, connectors: live.map((x) => x.name).filter((n) => !mcp.failed.includes(n)), markup })
      const signal = controller.signal
      let text = ""

      /** One streamed pass. Returns the text of its last step and the messages it added. */
      const pass = async (messages: ModelMessage[], opts: { tools?: ToolSet; toolChoice?: ToolChoice<ToolSet>; steps?: number; onAskStart?: () => void } = {}) => {
        const result = streamText({
          model,
          system,
          messages,
          tools: opts.tools ?? tools,
          toolChoice: opts.toolChoice,
          stopWhen: stepCountIs(opts.steps ?? 10),
          abortSignal: signal,
          maxOutputTokens: 16000,
        })
        // Batch streamed tokens: one store update per ~50ms instead of one per token.
        let buffered = ""
        let lastFlush = 0
        let stepText = ""
        const flush = () => {
          if (buffered) appendText(loc, buffered)
          buffered = ""
          lastFlush = Date.now()
        }
        try {
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              text += part.text
              stepText += part.text
              buffered += part.text
              if (Date.now() - lastFlush > 50) flush()
            } else if (part.type === "tool-input-start") {
              flush()
              if (part.toolName === "ask_user") opts.onAskStart?.()
              useStore.getState().patchMessage(assistantId, { activity: ACTIVITY[part.toolName] ?? "Working…" }, convId)
            } else if (part.type === "start-step") {
              stepText = ""
              if (text) buffered += "\n\n"
            } else if (part.type === "tool-error") {
              flush()
              pushAction({ ok: false, message: "", log: { id: uid(), label: `${part.toolName.replace(/_/g, " ")} failed`, tone: "error" } })
            } else if (part.type === "error") {
              throw part.error
            }
          }
        } finally {
          flush()
        }
        return { stepText, messages: (await result.response).messages }
      }

      let history = toModelMessages(c, userMsg)
      const first = await pass(history)

      // Safety net: questions typed into the chat instead of the question card get turned into one.
      const asked = () => !!getMessage(loc)?.parts?.some((p) => p.type === "ask")
      if (!asked() && looksLikeQuestions(first.stepText)) {
        const before = getMessage(loc)?.parts
        try {
          history = [...history, ...first.messages, { role: "user", content: ASK_INSTEAD }]
          const forced = await pass(history, { tools: { ask_user: tools.ask_user }, toolChoice: { type: "tool", toolName: "ask_user" }, steps: 1, onAskStart: () => trimQuestions(loc) })
          history = [...history, ...forced.messages]
          if (asked()) await pass(history)
        } catch (e) {
          if (signal.aborted) throw e
          // Couldn't convert: keep the questions as the model wrote them.
          if (before) useStore.getState().patchMessage(assistantId, { parts: before, text: textOf(before) }, convId)
        }
      }
      if (!text.trim()) appendText(loc, "Done. The changes are on the canvas.")
    }
    useStore.getState().patchMessage(assistantId, { status: "done", activity: undefined }, convId)
    const final = useStore.getState().conversations.find((x) => x.id === convId)?.messages.find((m) => m.id === assistantId)
    if (final && useStore.getState().settings.speakReplies) speak(final.text)
  } catch (e) {
    const aborted = (e as Error)?.name === "AbortError" || controller?.signal.aborted
    if (aborted) appendText({ convId, msgId: assistantId }, "\n\n_Stopped._")
    useStore.getState().patchMessage(assistantId, aborted ? { status: "done", activity: undefined } : { status: "error", activity: undefined, error: friendlyError(e) }, convId)
  } finally {
    closeMcp()
    useStore.getState().setBusy(false)
    controller = null
  }
}

export function friendlyError(e: unknown): string {
  const err = e as { message?: string; statusCode?: number; responseBody?: string }
  let msg = err?.message ?? String(e)
  try {
    const body = err.responseBody ? JSON.parse(err.responseBody) : null
    msg = body?.error?.message ?? msg
  } catch {
    /* ignore */
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return "Couldn't reach the model provider from this page. If you're viewing the hosted preview, network calls are blocked there; run the app locally or deploy it and try again."
  if (err.statusCode === 401 || /invalid.*key|authentication/i.test(msg)) return `The provider rejected the API key. Check it in Settings. (${msg})`
  if (/image|vision|multimodal/i.test(msg) && /support/i.test(msg)) return `This model can't read images. Pick a vision model in the model menu. (${msg})`
  return msg
}

export function speak(text: string) {
  try {
    if (!("speechSynthesis" in window)) return
    const clean = text.replace(/[*_`#>]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1")
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(clean)
    u.rate = 1.04
    window.speechSynthesis.speak(u)
    return u
  } catch {
    return undefined
  }
}

// ───────────────────────── one-shot helpers (library) ─────────────────────────

export async function describeImage(src: string, instruction: string): Promise<string> {
  const { model } = currentModel()
  if (!model) throw new Error(NO_MODEL)
  const d = dataUrlParts(src)
  const res = await generateText({
    model,
    messages: [{ role: "user", content: [d ? ({ type: "image", image: d.base64, mediaType: d.mediaType } as never) : ({ type: "image", image: new URL(src) } as never), { type: "text", text: instruction }] }],
    maxOutputTokens: 900,
  })
  return res.text.trim()
}

export async function generate(prompt: string, system?: string, images: string[] = []): Promise<string> {
  const { model } = currentModel()
  if (!model) throw new Error(NO_MODEL)
  const content = [
    ...images.slice(0, 6).map((src) => {
      const d = dataUrlParts(src)
      return d ? { type: "image", image: d.base64, mediaType: d.mediaType } : { type: "image", image: new URL(src) }
    }),
    { type: "text", text: prompt },
  ]
  const res = await generateText({ model, system, messages: [{ role: "user", content: content as never }], maxOutputTokens: 2500 })
  return res.text.trim()
}
