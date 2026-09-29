/**
 * The Tata 1mg Dopamine design system, extracted from its portable HTML reference by
 * scripts/extract-design-system.cjs into src/prism/design-system/reference.json.
 * Used by the design system page (tabs) and by the agent (read_design_system).
 */

export interface Specimen {
  tag: string
  class: string
  text: string
  style: Record<string, string>
}

export type Block =
  | { type: "text"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "demo"; specimens: Specimen[] }
  | { type: "tokens"; kind: "spacing" | "radius" | "shadow" | "gradient"; items: { name: string; value: string }[] }
  | { type: "outline"; text: string }

export interface ReferenceTab {
  key: string
  group: "foundation" | "component" | "page"
  title: string
  label: string
  description: string
  facts: { label: string; value: string }[]
  notes: { label: string; text: string }[]
  sections: { title: string; description: string; blocks: Block[] }[]
  css: string
}

export interface DesignReference {
  source: string
  colors: {
    palettes: { id: string; name: string; stops: { stop: string; hex: string }[] }[]
    semantic: { token: string; role: string; maps: string; hex: string }[]
    brand: { hex: string; name: string; use: string }[]
  }
  tabs: ReferenceTab[]
}

let data: Promise<DesignReference> | null = null
export const loadDesignReference = () => (data ??= import("@/prism/design-system/reference.json").then((m) => m.default as unknown as DesignReference))

// ───────── Markdown for the agent ─────────

const cell = (s: string) => (s || "–").replace(/\|/g, "\\|").replace(/\n/g, " ")
const table = (rows: string[][]) => (rows.length ? [`| ${rows[0].map(cell).join(" | ")} |`, `| ${rows[0].map(() => "---").join(" | ")} |`, ...rows.slice(1).map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n") : "")

/** One row per specimen: what a component looks like, in the terms a wireframe needs. */
export function specimenRows(specimens: Specimen[]) {
  return [
    ["Specimen", "Size", "Padding", "Radius", "Fill", "Text colour", "Type", "Border", "Shadow"],
    ...specimens.map((s) => {
      const st = s.style
      const type = st["font-size"] ? `${st["font-family"] ?? ""} ${st["font-size"]}/${st["font-weight"] ?? ""}${st["line-height"] && st["line-height"] !== "normal" ? ` lh ${st["line-height"]}` : ""}`.trim() : ""
      const fill = st["background-image"] && st["background-image"] !== "none" ? st["background-image"] : st["background-color"] ?? ""
      return [`${s.text || "(no text)"} · ${s.tag}${s.class ? `.${s.class.split(" ")[0]}` : ""}`, `${(st.width ?? "").replace("px", "")}×${st.height ?? ""}`, st.padding ?? "", st["border-radius"] ?? "", fill, st.color ?? "", type, st.border ?? "", st["box-shadow"] ?? ""]
    }),
  ]
}

function blockMarkdown(b: Block): string {
  if (b.type === "text") return b.text
  if (b.type === "table") return table(b.rows)
  if (b.type === "demo") return b.specimens.length ? table(specimenRows(b.specimens)) : ""
  if (b.type === "tokens") return table([["Token", "Value"], ...b.items.map((i) => [i.name, i.value])])
  return "```text\n" + b.text + "\n```"
}

export function tabMarkdown(tab: ReferenceTab, opts: { css?: boolean } = {}) {
  const out = [`# ${tab.title} (${tab.label || tab.group})`, tab.description]
  if (tab.facts.length) out.push(tab.facts.map((f) => `**${f.label}:** ${f.value}`).join(" · "))
  for (const n of tab.notes) out.push(`> **${n.label}:** ${n.text}`)
  for (const s of tab.sections) {
    const body = s.blocks.map(blockMarkdown).filter(Boolean)
    if (!s.title && !s.description && !body.length) continue
    out.push([s.title ? `## ${s.title}` : "", s.description, ...body].filter(Boolean).join("\n\n"))
  }
  if (opts.css !== false && tab.css) out.push("## CSS from the reference\n```css\n" + tab.css + "\n```")
  return out.filter(Boolean).join("\n\n")
}

export function colorsMarkdown(ref: DesignReference) {
  const { palettes, semantic, brand } = ref.colors
  return [
    "# Colours",
    "Apply colours by semantic role (see the semantic tokens), never by decorative palette name.",
    "## Brand",
    table([["Name", "Hex", "Use"], ...brand.map((b) => [b.name, b.hex, b.use])]),
    "## Semantic tokens",
    table([["Token", "Role", "Maps to", "Hex"], ...semantic.map((s) => [s.token, s.role, s.maps, s.hex])]),
    "## Palettes",
    ...palettes.map((p) => `**${p.name}** (${p.id}): ${p.stops.map((s) => `${s.stop} ${s.hex}`).join(" · ")}`),
  ].join("\n\n")
}

/** What read_design_system returns with no section: the list of sections to ask for. */
export function referenceIndex(ref: DesignReference) {
  const line = (t: ReferenceTab) => `- ${t.key}: ${t.title}. ${t.description.slice(0, 140)}`
  const groups: [string, ReferenceTab[]][] = [
    ["Foundations", ref.tabs.filter((t) => t.group === "foundation")],
    ["Components", ref.tabs.filter((t) => t.group === "component")],
    ["Page references", ref.tabs.filter((t) => t.group === "page")],
  ]
  return groups.map(([name, tabs]) => `${name}\n${tabs.map(line).join("\n")}`).join("\n\n")
}

export async function referenceSection(section: string): Promise<string | null> {
  const ref = await loadDesignReference()
  const key = section.trim().toLowerCase()
  if (key === "colors" || key === "colours") {
    const extra = ref.tabs.find((t) => t.key === "colors")?.sections.flatMap((s) => s.blocks).filter((b) => b.type === "text").map(blockMarkdown) ?? []
    return [colorsMarkdown(ref), ...extra].join("\n\n")
  }
  const tab = ref.tabs.find((t) => t.key === key || t.title.toLowerCase() === key)
  return tab ? tabMarkdown(tab) : null
}

export async function referenceKeys() {
  return (await loadDesignReference()).tabs.map((t) => t.key)
}
