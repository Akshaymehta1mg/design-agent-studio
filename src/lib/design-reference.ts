import type { DesignEdits } from "./types"

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

export async function referenceSection(section: string, edits?: DesignEdits): Promise<string | null> {
  const ref = applyEdits(await loadDesignReference(), edits)
  const key = section.trim().toLowerCase()
  if (key === "colors" || key === "colours") {
    const extra = ref.tabs.find((t) => t.key === "colors")?.sections.flatMap((s) => s.blocks).filter((b) => b.type === "text").map(blockMarkdown) ?? []
    return [colorsMarkdown(ref), ...extra].join("\n\n")
  }
  const tab = ref.tabs.find((t) => t.key === key || t.title.toLowerCase() === key)
  if (!tab) return null
  const change = edits?.components?.[tab.key]
  // Team changes lead, so they win over the original rules below them.
  return change ? `## Team changes to ${tab.title} (these override the original below)\n${change.spec}\n\n${tabMarkdown(tab)}` : tabMarkdown(tab)
}

// ───────── team edits layered on the extracted reference ─────────

const cloneRef = (ref: DesignReference): DesignReference => JSON.parse(JSON.stringify(ref))

/** The reference with the team's edits applied. The original data is never modified. */
export function applyEdits(ref: DesignReference, edits: DesignEdits = {}): DesignReference {
  const out = cloneRef(ref)
  for (const p of out.colors.palettes) for (const st of p.stops) st.hex = edits.palettes?.[`${p.id}:${st.stop}`] ?? st.hex
  for (const s of out.colors.semantic) {
    const hex = edits.semantic?.[s.token]
    if (hex) Object.assign(s, { hex, maps: `${hex} (edited; was ${s.maps})` })
  }
  for (const b of out.colors.brand) b.hex = edits.brand?.[b.name] ?? b.hex
  // Tokens that name a palette stop ("Cool Neutral 90") take its colour, so palette edits flow through to them.
  for (const s of out.colors.semantic) if (!s.hex) s.hex = paletteHex(out, s.maps) ?? ""
  for (const tab of out.tabs) {
    for (const sec of tab.sections) {
      for (const block of sec.blocks) {
        if (block.type === "tokens") for (const i of block.items) i.value = edits.tokens?.[`${tab.key}:${i.name}`] ?? i.value
        if (block.type === "table" && tab.key === "typography") for (const r of block.rows.slice(1)) r[1] = edits.type?.[r[0]] ?? r[1]
        if (block.type === "demo") {
          const patches = edits.components?.[tab.key]?.specimens ?? []
          for (const sp of block.specimens)
            for (const patch of patches)
              if (specimenMatches(sp, patch.match)) sp.style = { ...sp.style, ...patch.style }
        }
      }
    }
  }
  return out
}

/** "Cool Neutral 90" → that stop's hex; "White + Alpha 80" → rgba; "Brand Coral" → the primary brand colour. */
function paletteHex(ref: DesignReference, maps: string): string | undefined {
  const m = maps.trim()
  const alpha = m.match(/^(white|black)\s*\+\s*alpha\s*(\d+)/i)
  if (alpha) return `rgba(${alpha[1].toLowerCase() === "white" ? "255,255,255" : "0,0,0"},${Number(alpha[2]) / 100})`
  if (/brand coral/i.test(m)) return ref.colors.brand.find((b) => /coral/i.test(b.name))?.hex
  const stop = m.match(/^(.*?)\s+(\d+)$/)
  if (!stop) return undefined
  const name = stop[1].toLowerCase()
  const palette = ref.colors.palettes.find((p) => p.name.toLowerCase() === name || p.name.toLowerCase().endsWith(name) || p.id.toLowerCase() === name.replace(/\s+/g, ""))
  return palette?.stops.find((s) => s.stop === stop[2])?.hex
}

/** A patch applies to specimens whose text, class or tag contains its match ("*" matches all). */
export const specimenMatches = (sp: Specimen, match: string) => {
  const m = match.trim().toLowerCase()
  return m === "*" || !m || sp.text.toLowerCase().includes(m) || sp.class.toLowerCase().includes(m) || sp.tag === m
}

/** Short, plain-language list of what the team changed, for the agent's system prompt. */
export function editsSummary(edits?: DesignEdits): string {
  if (!edits) return ""
  const lines: string[] = []
  for (const [k, v] of Object.entries(edits.semantic ?? {})) lines.push(`- Colour token ${k} is now ${v}`)
  for (const [k, v] of Object.entries(edits.brand ?? {})) lines.push(`- Brand colour ${k} is now ${v}`)
  for (const [k, v] of Object.entries(edits.palettes ?? {})) lines.push(`- Palette ${k.replace(":", " ")} is now ${v}`)
  for (const [k, v] of Object.entries(edits.type ?? {})) lines.push(`- Type style ${k} is now ${v}`)
  for (const [k, v] of Object.entries(edits.tokens ?? {})) lines.push(`- ${k.replace(":", " token ")} is now ${v}`)
  for (const [k, c] of Object.entries(edits.components ?? {})) lines.push(`- ${k}: ${c.summary} (read_design_system section "${k}" for the updated rules)`)
  return lines.join("\n")
}

export const hasEdits = (e?: DesignEdits) => !!e && Object.values(e).some((v) => v && Object.keys(v).length)

export async function referenceKeys() {
  return (await loadDesignReference()).tabs.map((t) => t.key)
}
