/**
 * Prism's design loop as separate steps. Each reply does one step and stops at its checkpoint; the
 * designer's answer starts the next step as a new reply, instead of one long reply that runs from the
 * brief all the way to a prototype.
 */
import type { Conversation } from "./types"

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

export function phasePrompt(p: Phase): string {
  const head = `Current step: ${p === "refine" ? "Refine" : `${PHASES.findIndex((x) => x.id === p) + 1} of 4 · ${phaseLabel(p)}`}. Work in steps: do ONLY this step in this reply, end at its checkpoint, and stop. The designer's answer starts the next step.`
  const body: Record<Phase, string> = {
    discover: `Understand the moment from the brief and anything attached (screens, PDFs, files). In 2–4 short sentences, say what you understand: who is acting, what they came to do, where progress breaks, and what's at stake. Then ask the focused discovery question(s) that could change the solution (ask_user, 1–3 questions with options). Do not research, propose directions or build anything in this step.
If the brief and earlier answers already cover what you need, don't ask: call next_phase with to "research" (or "directions" when research can't change the decision) and a one-line reason. If the designer asks you to skip ahead (e.g. "just build it"), call next_phase with to "build".`,
    research: `Decide whether learning can change the decision. If it can't (familiar pattern, reversible, evidence already given), call next_phase with to "directions" and say why in one line. Otherwise run a bounded pass: the Product Thinking Gate (prism_reference "product-thinking-gate") and a visual research pass (search_visual_research then view_visual_research; Mobbin tools when connected). Share a short insight packet in the reply: the patterns worth adopting, what must change for this product, and what not to copy, with the references you used. Then end with one ask_user approval card (no questions) titled "Continue to directions?" so the designer can react before you explore directions.`,
    directions: `Present two or three structurally different directions for this moment, one of them the familiar/simple pattern. For each: the idea in one line, how it solves the breakdown, and its main trade-off. Recommend one by subtraction (least effort and machinery that still handles the important states). End with ask_user: one question "Which direction should I prototype?" with each direction as an option (recommended first). Do not build anything yet.`,
    build: `Build the chosen direction (see Decisions) as one interactive prototype: create_prototype with the plan and the first 2–4 screens, then add_prototype_screens until the plan is built. Read the design-system sections you need first. Then close with brief Design Notes: what you built, key decisions, assumptions and open questions (one short paragraph or bullets, or add_note if long).`,
    refine: `The prototype exists. Handle the designer's feedback: iterate_prototype for a new version, notes or critique when asked, answers in chat. Ask only when a choice genuinely needs the designer. If they start a different brief (a new flow or problem), call next_phase with to "discover".`,
  }
  return `${head}\n${body[p]}`
}
