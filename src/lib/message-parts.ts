import type { AskQuestion, AskStatus, MessagePart, PlanStatus, Workflow } from "./types"
import { uid, useStore } from "./store"

type Loc = { convId: string; msgId: string }

function patchParts(loc: Loc, fn: (parts: MessagePart[]) => MessagePart[]) {
  useStore.getState().patchMessage(loc.msgId, (m) => {
    const parts = fn(m.parts ?? [])
    const text = parts
      .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("\n\n")
    return { parts, text }
  }, loc.convId)
}

/** Stream text into the last text part, starting a new one after any non-text part. */
export function appendText(loc: Loc, delta: string) {
  patchParts(loc, (parts) => {
    const last = parts[parts.length - 1]
    if (last?.type === "text") return [...parts.slice(0, -1), { ...last, text: last.text + delta }]
    const trimmed = delta.replace(/^\s+/, "")
    return trimmed ? [...parts, { type: "text", id: uid("p_"), text: trimmed }] : parts
  })
  useStore.getState().patchMessage(loc.msgId, { activity: undefined }, loc.convId)
}

export function upsertPart(loc: Loc, part: MessagePart) {
  patchParts(loc, (parts) => (parts.some((p) => p.id === part.id) ? parts.map((p) => (p.id === part.id ? part : p)) : [...parts, part]))
}

export function getPart(loc: Loc, id: string) {
  return useStore.getState().conversations.find((c) => c.id === loc.convId)?.messages.find((m) => m.id === loc.msgId)?.parts?.find((p) => p.id === id)
}

// ───────── plans ─────────
export function setPlan(loc: Loc, title: string, items: { id?: string; title: string; status: PlanStatus }[]) {
  const existing = useStore
    .getState()
    .conversations.find((c) => c.id === loc.convId)
    ?.messages.find((m) => m.id === loc.msgId)
    ?.parts?.find((p) => p.type === "plan")
  const id = existing?.id ?? uid("plan_")
  upsertPart(loc, { type: "plan", id, title, items: items.map((it, i) => ({ id: it.id ?? `t${i}`, title: it.title, status: it.status })) })
  return id
}

// ───────── human-in-the-loop questions ─────────
const waiting = new Map<string, (answer: string) => void>()

export function askUser(
  loc: Loc,
  input: { title: string; description?: string; questions?: AskQuestion[]; approveLabel?: string },
  signal?: AbortSignal,
): Promise<string> {
  const id = uid("ask_")
  upsertPart(loc, { type: "ask", id, ...input, status: "pending" })
  useStore.getState().patchMessage(loc.msgId, { activity: "Waiting for your answer…" }, loc.convId)
  return new Promise<string>((resolve) => {
    waiting.set(id, resolve)
    signal?.addEventListener("abort", () => answerAsk(loc, id, "rejected", "Stopped before you answered."))
  })
}

/** Called by the approval card. */
export function answerAsk(loc: Loc, id: string, status: AskStatus, result: string, answers?: { question: string; answer: string }[]) {
  const part = getPart(loc, id)
  if (part?.type === "ask") upsertPart(loc, { ...part, status, result, answers })
  useStore.getState().patchMessage(loc.msgId, { activity: "Thinking…" }, loc.convId)
  const resolve = waiting.get(id)
  waiting.delete(id)
  resolve?.(result)
}

export const isWaiting = (id: string) => waiting.has(id)

// ───────── workflows ─────────
export function addWorkflowPart(loc: Loc, frameId: string, workflow: Workflow) {
  upsertPart(loc, { type: "workflow", id: uid("wf_"), frameId, workflow })
}

// ───────── prototypes ─────────
export function addPrototypePart(loc: Loc, frameId: string) {
  upsertPart(loc, { type: "prototype", id: uid("pr_"), frameId })
}
