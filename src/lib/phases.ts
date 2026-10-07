/**
 * Prism's design loop as separate steps. Each reply does one step and stops at its checkpoint; the
 * designer's answer starts the next step as a new reply, instead of one long reply that runs from the
 * brief all the way to a prototype.
 */
import type { ChatMessage, Conversation } from "./types"

export type Phase = "discover" | "research" | "directions" | "build" | "refine"

export const PHASES: { id: Phase; label: string; short: string }[] = [
  { id: "discover", label: "Understand", short: "1" },
  { id: "research", label: "Research", short: "2" },
  { id: "directions", label: "Directions", short: "3" },
  { id: "build", label: "Prototype", short: "4" },
  { id: "refine", label: "Refine", short: "" },
]

export const phaseLabel = (p: Phase) => PHASES.find((x) => x.id === p)!.label

/** Steps that end at a checkpoint (an answered question moves to the next step). */
export const GATED = new Set<Phase>(["discover", "research", "directions"])

export const NEXT: Record<Phase, Phase> = { discover: "research", research: "directions", directions: "build", build: "refine", refine: "refine" }

/** Tools each step may use (plus markup and connector tools where noted in agent.ts). */
export const PHASE_TOOLS: Record<Phase, string[] | "all"> = {
  discover: ["ask_user", "update_plan", "read_design_system", "prism_reference", "next_phase"],
  research: ["ask_user", "search_visual_research", "view_visual_research", "prism_reference", "read_design_system", "add_note", "next_phase"],
  directions: ["ask_user", "prism_reference", "read_design_system", "create_workflow", "add_note", "next_phase"],
  build: ["create_prototype", "add_prototype_screens", "iterate_prototype", "create_wireframe", "iterate_wireframe", "read_design_system", "prism_reference", "update_plan", "add_note", "create_workflow"],
  refine: "all",
}

/** Research may use connector tools (e.g. Mobbin); later steps keep them too. */
export const CONNECTORS_IN = new Set<Phase>(["research", "build", "refine"])

/** Where a conversation is: saved on it, or inferred for projects that predate steps. */
export function currentPhase(c: Conversation): Phase {
  if (c.phase) return c.phase
  const built = c.canvas.nodes.some((n) => n.kind === "frame" && n.source === "agent")
  return built ? "refine" : "discover"
}

/** The automatic message that starts the next step. */
export const isContinueMessage = (text: string) => /^Continue with step \d/.test(text.trim())

/** The designer asks for the thing itself: a prototype, screens, or a direction built. */
export function wantsToBuild(text: string): boolean {
  if (isContinueMessage(text)) return false
  const t = text.toLowerCase()
  if (/\b(just build it|build it|go ahead and build|let'?s build|start building|prototype it|prototype this|prototype that)\b/.test(t)) return true
  return /\b(build|make|create|generate|design|draw|put|show|turn)\b[^.?!\n]{0,60}\b(prototypes?|wireframes?|screens?|mock-?ups?|on (?:the |to the )?canvas|direction [a-c1-3]|option [a-c1-3])\b/.test(t)
}

/**
 * The step a reply works on. A step ends at its checkpoint, and clicking an answer moves to the next one.
 * Designers also answer by typing (or stop the reply and type), and ask to skip ahead ("make the prototype"),
 * so a typed message moves the conversation on too: to the prototype when it asks for one, otherwise
 * past a checkpoint the previous reply left open.
 */
export function startPhase(c: Conversation, user: ChatMessage): Phase {
  const p = currentPhase(c)
  if (!GATED.has(p) || isContinueMessage(user.text)) return p
  if (wantsToBuild(user.text)) return "build"
  const i = c.messages.findIndex((m) => m.id === user.id)
  const before = i >= 0 ? c.messages.slice(0, i) : c.messages
  const prev = [...before].reverse().find((m) => m.role === "assistant")
  if (!prev || prev.status !== "done" || prev.phase !== p) return p
  const passed = prev.parts?.some((x) => x.type === "ask" && (x.status === "answered" || x.status === "approved"))
  return passed ? p : NEXT[p]
}

/** HTML pasted into the chat instead of built on the canvas. */
const CODE_BLOCK = /```(?:html|htm|xml)?\s*\n?\s*<(?:!doctype|html|head|body|div|section|main|style)[\s\S]*?(?:```|$)/gi
const BARE_HTML = /<!doctype html[\s\S]*?(?:<\/html>|$)/gi
export const hasCodeDump = (text: string) => {
  CODE_BLOCK.lastIndex = 0
  BARE_HTML.lastIndex = 0
  return CODE_BLOCK.test(text) || BARE_HTML.test(text)
}
export const stripCodeDump = (text: string) => text.replace(CODE_BLOCK, "").replace(BARE_HTML, "").replace(/\n{3,}/g, "\n\n").trim()

export function phasePrompt(p: Phase): string {
  const head = `Current step: ${p === "refine" ? "Refine" : `${PHASES.findIndex((x) => x.id === p) + 1} of 4 · ${phaseLabel(p)}`}. Work in steps: do ONLY this step in this reply, end at its checkpoint, and stop. The designer's answer starts the next step.`
  const body: Record<Phase, string> = {
    discover: `Understand the moment from the brief and anything attached (screens, PDFs, files). In 2–4 short sentences, say what you understand: who is acting, what they came to do, where progress breaks, and what's at stake. Then ask the focused discovery question(s) that could change the solution (ask_user, 1–3 questions with options). Do not research, propose directions or build anything in this step.
If the brief and earlier answers already cover what you need, don't ask: call next_phase with to "research" (or "directions" when research can't change the decision) and a one-line reason. If the designer asks you to skip ahead (e.g. "just build it"), call next_phase with to "build".`,
    research: `Decide whether learning can change the decision. If it can't (familiar pattern, reversible, evidence already given), call next_phase with to "directions" and say why in one line. Otherwise run a bounded pass: the Product Thinking Gate (prism_reference "product-thinking-gate") and a visual research pass (search_visual_research then view_visual_research; Mobbin tools when connected). Share a short insight packet in the reply: the patterns worth adopting, what must change for this product, and what not to copy, with the references you used. Then end with one ask_user approval card (no questions) titled "Continue to directions?" so the designer can react before you explore directions.
If the designer asks you to build now (a prototype, screens, "just build it"), call next_phase with to "build".`,
    directions: `Present two or three structurally different directions for this moment, one of them the familiar/simple pattern. For each: the idea in one line, how it solves the breakdown, and its main trade-off. Recommend one by subtraction (least effort and machinery that still handles the important states). End with ask_user: one question "Which direction should I prototype?" with each direction as an option (recommended first). Do not build anything yet: no prototype, no screens, and never HTML or code in the chat.
If the designer has already picked a direction or asks you to build (a prototype, screens, "on the canvas"), don't present directions again: call next_phase with to "build".`,
    build: `Build the chosen direction (see Decisions; if none was picked, the recommended one, and say so) as one interactive prototype ON THE CANVAS with the tools, never as HTML or code in the chat: create_prototype with the plan and the first 2–4 screens, then add_prototype_screens until the plan is built. Read the design-system sections you need first. Then close with brief Design Notes: what you built, key decisions, assumptions and open questions (one short paragraph or bullets, or add_note if long).`,
    refine: `The prototype exists. Handle the designer's feedback: iterate_prototype for a new version, notes or critique when asked, answers in chat. Ask only when a choice genuinely needs the designer. If they start a different brief (a new flow or problem), call next_phase with to "discover".`,
  }
  return `${head}\n${body[p]}`
}
