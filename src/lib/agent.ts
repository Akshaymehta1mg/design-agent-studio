import { streamText, generateText, tool, stepCountIs, type ModelMessage, type LanguageModel } from "ai"
import { z } from "zod"
import type { ActionLog, Attachment, ChatMessage, Conversation, FrameNode, ProductLibrary } from "./types"
import { frameLabel, uid, useStore } from "./store"
import { getLanguageModel, type KeyedProvider } from "./providers"
import { addMarks, addNote, createWireframe, createWorkflow, figmaComment, iterateWireframe, type ActionResult } from "./canvas-actions"
import { addWorkflowPart, appendText, askUser, setPlan } from "./message-parts"
import { EXAMPLE_WIREFRAMES } from "./wireframe"
import { dataUrlParts } from "./files"
import { allDesignSystems, BUILTIN_DESIGN_SYSTEMS } from "./design-systems"
import { connectorTools } from "./mcp"
import { hasFigmaAccess } from "./figma"
import { viaServer, type ServerUpstream } from "./server"

// ───────────────────────── model access ─────────────────────────

export function currentModel(): { model: LanguageModel | null; label: string; demo: boolean } {
  const { settings } = useStore.getState()
  const sel = settings.selectedModel
  if (sel.provider === "demo") return { model: null, label: sel.name, demo: true }
  const p = settings.providers[sel.provider as KeyedProvider]
  if (!p || (!p.apiKey && sel.provider !== "custom" && !viaServer(sel.provider as ServerUpstream))) return { model: null, label: "Demo agent (offline)", demo: true }
  return { model: getLanguageModel(sel.provider as KeyedProvider, sel.id, p), label: sel.name, demo: false }
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

export function systemPrompt(c: Conversation, product: ProductLibrary, opts: { figma: boolean; connectors?: string[] }): string {
  const ctx = productContext(product)
  const ds = designSystemFor(c)
  return `You are Design Agent, a senior product design lead working with a designer in Design Agent Studio. You share a canvas with them: screenshots, Figma exports and your own wireframes sit on it side by side.

How you work
- Be specific and grounded in what you can see. Name the element, say what's wrong or right, say why it matters for the user or the business, and say what to do. No generic advice.
- Keep chat replies short (2–6 sentences or a tight list). Put detailed feedback on the canvas with tools, then summarise the key insight in chat.
- If you're unsure what they want, make a sensible call and say what you assumed.

Canvas tools
- create_wireframe: when asked for a wireframe, mockup, layout, screen or flow step that doesn't exist yet. For a multi-screen flow, call it once per screen.
- iterate_wireframe: when asked to iterate, revise, try another version, apply feedback or explore a variant. This ALWAYS creates a new version next to the source (V2, V3…). You cannot and must not edit an existing frame. Iterate from the latest version in a lineage unless the designer points at a specific one. You can also iterate from a screenshot to produce a wireframe proposal.
- annotate: mark regions of a frame (x, y, w, h as fractions 0–1 of the frame from its top-left). Use for critique. Keep each label under 30 words; lead with the problem.
- comment: a pinned point comment on a frame for a single, local remark.
- add_note: a sticky note on the canvas for summaries, rationale, open questions or next steps.
- create_workflow: when asked for a user flow, journey, process, decision tree or any step-by-step flow. Nodes are steps (kind start, step, decision or end); edges connect them. Mark return paths (retry, go back, iterate until good) as kind "loop". Keep titles short; put the detail in description, content and footer.

Working with the designer
- update_plan: for multi-step work (several screens, a flow plus wireframes, a review then an iteration), call it first with your plan, then again as you go, marking items in-progress and completed. Skip it for single quick actions.
- ask_user: when a decision genuinely changes what you'll make (direction, scope, which variant) or before something the designer might not want (posting to Figma, replacing many items). Offer 2–4 short options and allowCustom. Without questions it becomes an approve / request changes / reject card. It waits for the answer; don't ask more than one per turn.${opts.figma ? "\n- figma_comment: post a comment into the linked Figma file. Only when the designer asks for Figma comments, or when they've enabled it and you're giving critique on Figma frames." : ""}

Wireframe HTML
- Write an HTML fragment for the page body. No <script>, no external images or fonts, no <html>/<head>. Placeholder images: <div class="wf-img" style="height:160px"></div>.
- Low-fidelity grayscale with real, specific copy from the product context. Width is fixed by the device (mobile 390px, tablet 820px, desktop 1280px); design for that width.
- Helper classes: wf-screen (root, full height column), wf-status (phone status bar), wf-bar + wf-title (top bar), wf-body (padded column), wf-footer (bottom action area), wf-row, wf-col, wf-grid, wf-between, wf-h1, wf-h2, wf-h3, wf-text, wf-muted, wf-label, wf-card, wf-fill, wf-divider, wf-img, wf-avatar, wf-icon, wf-btn, wf-btn-primary, wf-btn-block, wf-btn-sm, wf-input, wf-chip, wf-chip-on, wf-tag, wf-list, wf-scroll-x, wf-tabbar, wf-sheet, wf-handle, wf-note. Inline styles are fine for anything else.
- Follow the project's design system below: its structure, components, spacing and voice. The canvas applies its accent color, radius and font to your wireframes automatically.
${opts.connectors?.length ? `\nConnected tools\n- You can also use tools from: ${opts.connectors.join(", ")}. Tool names are prefixed with the connector. Use them when the designer refers to those products.\n` : ""}
Design system: ${ds.name}
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

function canvasTools(convId: string, msgId: string, log: (r: ActionResult) => void, figma: boolean, signal?: AbortSignal) {
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
      description: "Ask the designer a question (with options) or for approval, and wait for the answer.",
      inputSchema: z.object({
        title: z.string().describe("The question, or what needs approval"),
        description: z.string().optional(),
        approve_label: z.string().optional().describe("Button label for approval cards, e.g. 'Post 3 comments'"),
        questions: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              description: z.string().optional(),
              options: z.array(z.object({ value: z.string(), label: z.string() })).max(6).optional(),
              multiple: z.boolean().optional(),
              allowCustom: z.boolean().optional(),
            }),
          )
          .max(4)
          .optional(),
      }),
      execute: async ({ approve_label, ...i }) => {
        const answer = await askUser(loc, { ...i, approveLabel: approve_label }, signal)
        return `Designer's answer: ${answer}`
      },
    }),
  }
  if (!figma) return tools
  return {
    ...tools,
    figma_comment: tool({
      description: "Post a comment to the linked Figma file, pinned to the frame's Figma node when known.",
      inputSchema: z.object({ message: z.string(), frame_id: z.string().optional() }),
      execute: async (i) => wrap(await figmaComment(convId, i)),
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
}

export async function runChat(convId: string, userMsg: ChatMessage) {
  let closeMcp = () => {}
  const store = useStore.getState()
  const { model, label, demo } = currentModel()
  const assistantId = uid("c_")
  store.addMessage({ id: assistantId, role: "assistant", text: "", status: "streaming", model: label, actions: [], createdAt: Date.now(), activity: "Thinking…" }, convId)
  store.setBusy(true)
  const pushAction = (r: ActionResult) => {
    if (r.log) useStore.getState().patchMessage(assistantId, (m) => ({ actions: [...(m.actions ?? []), r.log as ActionLog] }), convId)
  }
  controller = new AbortController()
  try {
    if (demo || !model) {
      await runDemo(convId, userMsg, assistantId, pushAction, controller.signal)
    } else {
      const c = useStore.getState().conversations.find((x) => x.id === convId)!
      const figmaOn = !!(c.figma?.allowComments && hasFigmaAccess(useStore.getState().settings.figmaToken))
      const live = useStore.getState().connectors.filter((x) => x.enabled && x.status === "ok")
      if (live.length) useStore.getState().patchMessage(assistantId, { activity: "Connecting your tools…" }, convId)
      const mcp = live.length ? await connectorTools(live) : { tools: {}, close: () => {}, failed: [] as string[] }
      closeMcp = mcp.close
      const result = streamText({
        model,
        system: systemPrompt(c, useStore.getState().product, { figma: figmaOn, connectors: live.map((x) => x.name).filter((n) => !mcp.failed.includes(n)) }),
        messages: toModelMessages(c, userMsg),
        tools: { ...mcp.tools, ...canvasTools(convId, assistantId, pushAction, figmaOn, controller.signal) },
        stopWhen: stepCountIs(10),
        abortSignal: controller.signal,
        maxOutputTokens: 16000,
      })
      let text = ""
      const loc = { convId, msgId: assistantId }
      // Batch streamed tokens: one store update per ~50ms instead of one per token.
      let buffered = ""
      let lastFlush = 0
      const flush = () => {
        if (buffered) appendText(loc, buffered)
        buffered = ""
        lastFlush = Date.now()
      }
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            text += part.text
            buffered += part.text
            if (Date.now() - lastFlush > 50) flush()
          } else if (part.type === "tool-input-start") {
            flush()
            useStore.getState().patchMessage(assistantId, { activity: ACTIVITY[part.toolName] ?? "Working…" }, convId)
          } else if (part.type === "start-step" && text) {
            buffered += "\n\n"
          } else if (part.type === "error") {
            throw part.error
          }
        }
      } finally {
        flush()
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
  const { model, demo } = currentModel()
  if (demo || !model) {
    await sleep(700)
    return "Example summary (demo agent): a mobile screen with a hero image, a title block, a primary action pinned to the bottom and a short list of options. Add a key in Settings for a real read."
  }
  const d = dataUrlParts(src)
  const res = await generateText({
    model,
    messages: [{ role: "user", content: [d ? ({ type: "image", image: d.base64, mediaType: d.mediaType } as never) : ({ type: "image", image: new URL(src) } as never), { type: "text", text: instruction }] }],
    maxOutputTokens: 900,
  })
  return res.text.trim()
}

export async function generate(prompt: string, system?: string, images: string[] = []): Promise<string> {
  const { model, demo } = currentModel()
  if (demo || !model) {
    await sleep(900)
    return ""
  }
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

// ───────────────────────── offline demo agent ─────────────────────────

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(t)
      rej(Object.assign(new Error("aborted"), { name: "AbortError" }))
    })
  })

async function typeOut(loc: { convId: string; msgId: string }, text: string, signal: AbortSignal) {
  for (const word of text.split(/(\s+)/)) {
    if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" })
    appendText(loc, word)
    await sleep(12)
  }
}

const DEMO_NOTE = "\n\nI'm the offline demo agent, so this comes from a small set of examples. Add a key in Settings and pick a model for real work."

const DEMO_WORKFLOW: import("./types").Workflow = {
  title: "Reserve a table",
  description: "From the restaurant page to a confirmed booking, with a retry loop when the slot is taken.",
  nodes: [
    { id: "page", title: "Restaurant page", description: "Entry", content: "Diner taps Reserve on Stella", footer: "Screen: Store · Dine-out tab", kind: "start" },
    { id: "slot", title: "Pick a time", description: "Party size, date, slot", content: "Grouped by sitting, best match pre-selected", footer: "Screen: Reserve sheet" },
    { id: "details", title: "Confirm details", description: "Name, phone, requests", content: "Prefilled from the account", footer: "Screen: Your details" },
    { id: "check", title: "Slot still free?", description: "Partner availability", content: "Hold for 5 minutes while confirming", footer: "Booking partner API", kind: "decision" },
    { id: "taken", title: "Offer nearby times", description: "Recover", content: "Show 3 closest slots, keep the details", footer: "Sheet: Slot taken" },
    { id: "done", title: "Booked", description: "Confirmation", content: "Add to calendar, directions, cancel link", footer: "Screen: Confirmation", kind: "end" },
  ],
  edges: [
    { from: "page", to: "slot" },
    { from: "slot", to: "details" },
    { from: "details", to: "check" },
    { from: "check", to: "done", label: "Yes" },
    { from: "check", to: "taken", label: "No" },
    { from: "taken", to: "slot", label: "Pick again", kind: "loop" },
  ],
}

async function runDemo(convId: string, msg: ChatMessage, assistantId: string, push: (r: ActionResult) => void, signal: AbortSignal) {
  const loc = { convId, msgId: assistantId }
  const t = msg.text.toLowerCase()
  const c = () => useStore.getState().conversations.find((x) => x.id === convId)!
  const attached = (msg.attachments ?? []).filter((a) => a.kind === "frame").map((a) => (a as { frameId: string }).frameId)
  const frames = c().canvas.nodes.filter((n): n is FrameNode => n.kind === "frame")
  const target = frames.find((f) => f.id === attached[0]) ?? [...frames].reverse().find((f) => f.type !== "workflow")
  const setActivity = (activity: string) => useStore.getState().patchMessage(assistantId, { activity }, convId)
  await sleep(450, signal)

  const wantsFlow = /flow|journey|workflow|process|diagram|map (the|out)/.test(t)
  const wantsIterate = /iterat|another|next version|revis|variant|again|improve|alternative|try /.test(t)
  const wantsWireframe = /wireframe|mock|layout|screen|draft|sketch|design (a|the|an)|create|make/.test(t)
  const wantsCritique = /annotat|critique|review|feedback|mark|what do you think|risk|problem|issue|audit/.test(t)

  if (wantsFlow) {
    const plan = (s: ("pending" | "in-progress" | "completed")[]) =>
      setPlan(loc, "Map the reservation flow", [
        { title: "Find the entry point and the goal", status: s[0] },
        { title: "Lay out the happy path", status: s[1] },
        { title: "Add the slot-taken recovery loop", status: s[2] },
        { title: "Put the flow on the canvas", status: s[3] ?? "pending" },
      ])
    plan(["in-progress", "pending", "pending"])
    await sleep(700, signal)
    plan(["completed", "in-progress", "pending"])
    await sleep(700, signal)
    plan(["completed", "completed", "in-progress"])
    setActivity(ACTIVITY.create_workflow)
    await sleep(700, signal)
    const r = createWorkflow(convId, DEMO_WORKFLOW)
    push(r)
    if (r.frameId) addWorkflowPart(loc, r.frameId, DEMO_WORKFLOW)
    setPlan(loc, "Map the reservation flow", [
      { title: "Find the entry point and the goal", status: "completed" },
      { title: "Lay out the happy path", status: "completed" },
      { title: "Add the slot-taken recovery loop", status: "completed" },
      { title: "Put the flow on the canvas", status: "completed" },
    ])
    await typeOut(loc, "The flow is six steps with one recovery loop: if the slot is gone at confirm time, offer the three nearest times and keep what they typed. That loop is where most booking flows lose people." + DEMO_NOTE, signal)
    return
  }

  if (wantsIterate && target) {
    const answer = await askUser(
      loc,
      {
        title: "What should the next version focus on?",
        questions: [
          {
            id: "focus",
            title: "What should the next version focus on?",
            description: `I'll add it beside ${frameLabel(target)} and leave that one as it is.`,
            options: [
              { value: "choice", label: "Fewer choices, smarter default" },
              { value: "grouping", label: "Group times by sitting" },
              { value: "trust", label: "Show policy and trust signals" },
            ],
            allowCustom: true,
          },
        ],
      },
      signal,
    )
    const lineage = frames.filter((f) => target.lineageId && f.lineageId === target.lineageId)
    const source = lineage.length ? lineage.reduce((a, b) => ((b.version ?? 0) > (a.version ?? 0) ? b : a)) : target
    const nextV = lineage.length ? Math.max(...lineage.map((f) => f.version ?? 1)) + 1 : 2
    const tpl = /choice|default/.test(answer) ? EXAMPLE_WIREFRAMES[2] : EXAMPLE_WIREFRAMES[(nextV - 1) % EXAMPLE_WIREFRAMES.length]
    setPlan(loc, `Build V${nextV}`, [
      { title: `Read ${frameLabel(source)}`, status: "completed" },
      { title: "Rework the layout", status: "in-progress" },
      { title: "Place it beside the source", status: "pending" },
    ])
    setActivity(ACTIVITY.iterate_wireframe)
    await sleep(900, signal)
    push(iterateWireframe(convId, { source_frame_id: source.id, html: tpl.html, change_summary: tpl.summary, title: source.title, device: "mobile" }))
    setPlan(loc, `Build V${nextV}`, [
      { title: `Read ${frameLabel(source)}`, status: "completed" },
      { title: "Rework the layout", status: "completed" },
      { title: "Place it beside the source", status: "completed" },
    ])
    await typeOut(loc, `Added **V${nextV}** beside ${frameLabel(source)}. ${tpl.summary}` + DEMO_NOTE, signal)
    return
  }

  if (wantsWireframe) {
    const tpl = EXAMPLE_WIREFRAMES[0]
    setPlan(loc, "Wireframe the reserve step", [
      { title: "Pull constraints from the Context file", status: "completed" },
      { title: "Draft the layout", status: "in-progress" },
      { title: "Place V1 on the canvas", status: "pending" },
    ])
    setActivity(ACTIVITY.create_wireframe)
    await sleep(1000, signal)
    push(createWireframe(convId, { title: tpl.title, html: tpl.html, summary: tpl.summary, device: "mobile" }))
    setPlan(loc, "Wireframe the reserve step", [
      { title: "Pull constraints from the Context file", status: "completed" },
      { title: "Draft the layout", status: "completed" },
      { title: "Place V1 on the canvas", status: "completed" },
    ])
    await typeOut(loc, `A first pass is on the canvas as **V1**: ${tpl.summary.toLowerCase()} Ask me to iterate and I'll add V2 next to it.` + DEMO_NOTE, signal)
    return
  }

  if ((wantsCritique || attached.length) && target) {
    setActivity(ACTIVITY.annotate)
    await sleep(800, signal)
    push(
      addMarks(convId, target.id, [
        { type: "annotation", x: 0.04, y: 0.06, w: 0.92, h: 0.16, text: "Top of the screen doesn't say what I can do here. Lead with the task, not the brand.", severity: "major" },
        { type: "annotation", x: 0.04, y: 0.42, w: 0.92, h: 0.22, text: "Options have equal weight. Pre-select the likely choice so most people can go straight to the CTA.", severity: "minor" },
        { type: "comment", x: 0.5, y: 0.92, text: "Primary action is clear and thumb-reachable. Keep it.", severity: "positive" },
      ]),
    )
    await typeOut(loc, `I marked up **${frameLabel(target)}**. The main risk is decision load: everything has equal weight, so the eye has nowhere to land.`, signal)
    const answer = await askUser(
      loc,
      { title: "Pin a crit summary next to the frame?", description: "A sticky note with the three points and one open question.", approveLabel: "Add the note" },
      signal,
    )
    if (/approved/i.test(answer)) {
      push(addNote(convId, { title: "Crit summary", text: "• Clarify the task in the header\n• Reduce choice with a smart default\n• Keep the pinned CTA\n\nOpen question: is this a same-day decision for most people?", near_frame_id: target.id }))
      await typeOut(loc, "\n\nPinned it beside the frame." + DEMO_NOTE, signal)
    } else {
      await typeOut(loc, "\n\nNo note then. Ask me to iterate when you're ready." + DEMO_NOTE, signal)
    }
    return
  }

  await typeOut(
    loc,
    "I'm running as the **offline demo agent**, so I can only show how the studio works. Try:\n- \"Wireframe a checkout screen\"\n- \"Iterate on it\" (I'll ask what to focus on, then add the next version)\n- \"Map the booking flow\" (an animated workflow)\n- Select a frame and ask \"Critique this\"\n\nTo talk to a real model, open **Settings**, add an Anthropic, OpenAI, Gemini or OpenRouter key and pick a model from the menu under the message box.",
    signal,
  )
}
