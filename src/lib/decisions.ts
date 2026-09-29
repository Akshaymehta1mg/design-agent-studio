import type { Conversation, MessagePart } from "./types"

type AskPart = Extract<MessagePart, { type: "ask" }>
export type Decision = { question: string; answer: string }

/** Cards answered before answers were stored separately only have the joined text; split it back up. */
export function legacyAnswers(part: AskPart): Decision[] | undefined {
  if (!part.result || !part.questions?.length) return undefined
  if (part.questions.length === 1) return [{ question: part.questions[0].title, answer: part.result }]
  const out = part.questions.flatMap((q, i) => {
    const start = part.result!.indexOf(`${q.title}: `)
    if (start < 0) return []
    const from = start + q.title.length + 2
    const next = part.questions!.slice(i + 1).map((n) => part.result!.indexOf(` · ${n.title}: `, from)).find((x) => x >= 0)
    return [{ question: q.title, answer: part.result!.slice(from, next ?? undefined).trim() }]
  })
  return out.length ? out : undefined
}

const ANSWERED = new Set(["answered", "approved", "changes-requested", "rejected"])

/** Every question the designer has answered in this project, oldest first (a later answer replaces an earlier one). */
export function answeredDecisions(c: Conversation): Decision[] {
  const byKey = new Map<string, Decision>()
  for (const m of c.messages) {
    for (const p of m.parts ?? []) {
      if (p.type !== "ask" || !ANSWERED.has(p.status) || /expired|stopped before|no longer waiting/i.test(p.result ?? "")) continue
      const list = p.answers ?? legacyAnswers(p) ?? [{ question: p.title, answer: p.result ?? p.status }]
      for (const d of list) byKey.set(questionKey(d.question), d)
    }
  }
  return [...byKey.values()]
}

/** Loose key for "is this the same question": case, punctuation and filler words don't matter. */
export function questionKey(q: string) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FILLER.has(w))
    .join(" ")
}
const FILLER = new Set(["the", "and", "you", "your", "should", "would", "want", "does", "what", "which", "how", "for", "with", "this", "that", "are", "can", "prefer", "like"])

/** Same question if the keys match, or one contains the other and both are specific enough. */
export function sameQuestion(a: string, b: string) {
  const x = questionKey(a)
  const y = questionKey(b)
  if (!x || !y) return false
  if (x === y) return true
  const [short, long] = x.length < y.length ? [x, y] : [y, x]
  return short.split(" ").length >= 3 && long.includes(short)
}
