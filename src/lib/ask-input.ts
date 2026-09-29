import { z } from "zod"
import type { AskQuestion } from "./types"

/**
 * Input for the ask_user tool. Deliberately forgiving: models often omit ids or option values,
 * send options as plain strings, or ask one question too many. A rejected call shows the designer
 * nothing and the model falls back to asking in plain chat text, so we accept and normalise instead.
 */
const option = z.union([z.string(), z.object({ value: z.string().optional(), label: z.string() })])

const question = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  options: z.array(option).optional().describe("2–4 short choices"),
  multiple: z.boolean().optional(),
  allowCustom: z.boolean().optional(),
})

export const MAX_QUESTIONS = 6
const MAX_OPTIONS = 8

export const askUserInput = z.object({
  title: z.string().describe("What the card is about, e.g. 'A few decisions before I draw it'"),
  description: z.string().optional(),
  approve_label: z.string().optional().describe("Button label for approval cards, e.g. 'Post 3 comments'"),
  questions: z.array(question).optional().describe(`Up to ${MAX_QUESTIONS} questions, asked one at a time`),
})

export type AskUserInput = z.infer<typeof askUserInput>

export function normalizeAsk(input: AskUserInput): { title: string; description?: string; approveLabel?: string; questions?: AskQuestion[] } {
  const questions = input.questions?.slice(0, MAX_QUESTIONS).map((q, i) => ({
    id: q.id?.trim() || `q${i + 1}`,
    title: q.title,
    description: q.description,
    multiple: q.multiple,
    allowCustom: q.allowCustom,
    options: q.options?.slice(0, MAX_OPTIONS).map((o, j) => {
      const label = typeof o === "string" ? o : o.label
      const value = (typeof o === "string" ? "" : o.value?.trim()) || label || `o${j + 1}`
      return { value, label }
    }),
  }))
  // Duplicate ids would merge answers, so make them unique.
  const seen = new Set<string>()
  for (const q of questions ?? []) {
    while (seen.has(q.id)) q.id += "_"
    seen.add(q.id)
  }
  return { title: input.title, description: input.description, approveLabel: input.approve_label, questions: questions?.length ? questions : undefined }
}
