import { generateText, tool } from "ai"
import { z } from "zod"
import type { ComponentEdit } from "./types"
import { currentModel, NO_MODEL } from "./agent"
import { tabMarkdown, type ReferenceTab } from "./design-reference"

const changeInput = z.object({
  summary: z.string().describe("One short line describing the change, e.g. 'Primary buttons are 48px tall with 12px radius'"),
  spec: z
    .string()
    .describe("The component's complete team rules after this change, in Markdown: every rule that now differs from the original reference, including earlier team changes that still apply. Concrete values only."),
  specimens: z
    .array(
      z.object({
        match: z.string().describe("Which demo specimens this applies to: text or class they contain (e.g. 'Continue', 'ADD'), a tag (e.g. 'button'), or '*' for all"),
        style: z.record(z.string(), z.string()).describe("CSS properties in kebab-case with values, e.g. { 'border-radius': '12px', height: '48px', 'background-color': '#FF6F61' }"),
      }),
    )
    .optional()
    .describe("Visual adjustments so the component's demos show the change"),
})

const SYSTEM = `You maintain the Tata 1mg Dopamine design system for a design team. You change one component (or page pattern) at a time, as the designer asks.
- Keep every change consistent with the rest of the system: use its colour tokens, Figtree type scale, 8-point spacing and documented radii unless the designer explicitly asks otherwise.
- Never use coral or orange except on the primary-action component tokens.
- Write the spec as the team's rules for this component after the change, not as a changelog. Keep earlier team changes unless this request replaces them.
- Only include specimen adjustments that make the demos reflect the change.`

/** Ask the selected model to change one component; returns the new team edit for it. */
export async function editComponentWithModel(tab: ReferenceTab, instruction: string, previous?: ComponentEdit): Promise<ComponentEdit> {
  const { model } = currentModel()
  if (!model) throw new Error(NO_MODEL)
  let result: z.infer<typeof changeInput> | null = null
  await generateText({
    model,
    system: SYSTEM,
    tools: {
      apply_component_change: tool({
        description: "Apply the change to the component.",
        inputSchema: changeInput,
        execute: async (input) => {
          result = input
          return "Applied."
        },
      }),
    },
    toolChoice: { type: "tool", toolName: "apply_component_change" },
    messages: [
      {
        role: "user",
        content: `Component reference (current, with earlier team changes applied to the demos):\n\n${tabMarkdown(tab)}\n\n${previous ? `Current team rules for this component:\n${previous.spec}\n\n` : ""}Change requested by the designer:\n${instruction}`,
      },
    ],
    maxOutputTokens: 3000,
  })
  if (!result) throw new Error("The model didn't return a change. Try describing it differently.")
  const r = result as z.infer<typeof changeInput>
  // Specimen patches accumulate: a later patch for the same match wins.
  const merged = new Map((previous?.specimens ?? []).map((p) => [p.match, p]))
  for (const p of r.specimens ?? []) merged.set(p.match, { match: p.match, style: { ...(merged.get(p.match)?.style ?? {}), ...p.style } })
  return { summary: r.summary, spec: r.spec, specimens: [...merged.values()], updatedAt: Date.now() }
}
