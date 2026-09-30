/**
 * Prism: the design agent's operating rules, split into three parts.
 *
 * 1. Prism core (src/prism/core): SKILL.md is always in the system prompt; its references load on demand.
 * 2. Design system (src/prism/design-system + public/prism/design-system): the Tata 1mg Dopamine guide is a
 *    built-in design system; its portable component reference is searched on demand.
 * 3. Visual research (src/prism/visual-research + public/prism/visual-research): a curated screen library the
 *    agent searches and inspects on demand, and people browse on the Visual research page.
 */
import PRISM_SKILL from "@/prism/core/SKILL.md?raw"
import TATA_1MG_GUIDE from "@/prism/design-system/tata-1mg-development-design-system.md?raw"
import TATA_1MG_TOKENS_RAW from "@/prism/design-system/tata-1mg.tokens.md?raw"

export { TATA_1MG_GUIDE }
export const TATA_1MG_TOKENS = TATA_1MG_TOKENS_RAW

const stripFrontMatter = (md: string) => md.replace(/^---\n[\s\S]*?\n---\n+/, "")

export const PRISM_CORE = stripFrontMatter(PRISM_SKILL)

/** A hand-condensed Prism core for models with small request limits; the full references stay reachable via prism_reference. */
export { default as PRISM_CORE_COMPACT } from "@/prism/core/SKILL.compact.md?raw"

// ───────── core references (loaded on demand) ─────────

const referenceLoaders = import.meta.glob("/src/prism/core/references/*.md", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>
const docLoaders: Record<string, () => Promise<string>> = {
  ...Object.fromEntries(Object.entries(referenceLoaders).map(([path, load]) => [path.split("/").pop()!.replace(/\.md$/, ""), load])),
  "mobbin-visual-pattern-research": () => import("@/prism/core/skills/mobbin-visual-pattern-research/SKILL.md?raw").then((m) => m.default),
  "visual-research-index": () => import("@/prism/visual-research/index.md?raw").then((m) => m.default),
  "prism-guide": () => import("@/prism/core/PRISM_GUIDE.md?raw").then((m) => m.default),
}

export const PRISM_DOCS = Object.keys(docLoaders).sort()

export async function loadPrismDoc(name: string): Promise<string | null> {
  const key = name.replace(/^.*\//, "").replace(/\.md$/, "")
  const load = docLoaders[key]
  return load ? stripFrontMatter(await load()) : null
}

// ───────── design system: portable component reference ─────────

export const TATA_1MG_REFERENCE_URL = "/prism/design-system/design-system.html"
export const TATA_1MG_ASSET_BASE = "/prism/design-system/assets/"
export const RX_FALLBACK_IMAGE = `${TATA_1MG_ASSET_BASE}rx-default-blister-pack.png`

let referenceHtml: Promise<string> | null = null

/** Search the portable design-system HTML for a component key and return trimmed excerpts. */
export async function searchDesignSystemReference(query: string, url = TATA_1MG_REFERENCE_URL): Promise<string> {
  referenceHtml ??= fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Couldn't load the design-system reference (${r.status}).`)
    return r.text()
  })
  let html: string
  try {
    html = (await referenceHtml).replace(/data:[a-z/+-]+;base64,[A-Za-z0-9+/=]{80,}/g, "data:…")
  } catch (e) {
    referenceHtml = null
    throw e
  }
  const q = query.trim().toLowerCase()
  if (!q) return "Give a component key, e.g. buttons, chips, sku-cards, actionbar, page-header, labs-home, DEFAULT_RX_SKU_IMAGE, const SEMANTIC=."
  const lower = html.toLowerCase()
  const hits: number[] = []
  for (let i = lower.indexOf(q); i >= 0 && hits.length < 12; i = lower.indexOf(q, i + q.length)) hits.push(i)
  if (!hits.length) return `No match for "${query}" in the component reference.`
  // Prefer matches inside component code over the navigation map; keep up to three distinct windows.
  const windows: [number, number][] = []
  for (const h of [...hits].reverse()) {
    const start = Math.max(0, h - 1200)
    const end = Math.min(html.length, h + 3800)
    if (windows.some(([s, e]) => start < e && end > s)) continue
    windows.push([start, end])
    if (windows.length === 3) break
  }
  return windows
    .sort((a, b) => a[0] - b[0])
    .map(([s, e], i) => `── Excerpt ${i + 1} (chars ${s}–${e}) ──\n${html.slice(s, e)}`)
    .join("\n\n")
}

// ───────── visual research ─────────

export const VISUAL_RESEARCH_URL = "/prism/visual-research/visual-research.html"

export interface VisualReference {
  id: string
  title: string
  pin_url: string
  image: string
  patterns: string[]
  description: string
  visible_text: string
}

let catalog: Promise<VisualReference[]> | null = null
export const loadVisualResearch = () => (catalog ??= import("@/prism/visual-research/catalog.json").then((m) => (m.default as { references: VisualReference[] }).references))

/** Rank references by pattern cluster, ids and words in their description, title and visible text. */
export async function searchVisualResearch(opts: { query?: string; pattern?: string; ids?: string[]; limit?: number }): Promise<VisualReference[]> {
  const refs = await loadVisualResearch()
  if (opts.ids?.length) return refs.filter((r) => opts.ids!.includes(r.id))
  const pattern = opts.pattern?.toLowerCase().trim()
  const words = (opts.query ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  const scored = refs
    .filter((r) => !pattern || r.patterns.some((p) => p.toLowerCase().includes(pattern)))
    .map((r) => {
      const hay = `${r.patterns.join(" ")} ${r.description} ${r.title} ${r.visible_text}`.toLowerCase()
      return { r, score: words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) }
    })
    .filter((x) => !words.length || x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, opts.limit ?? 12).map((x) => x.r)
}

export async function visualResearchPatterns(): Promise<string[]> {
  return [...new Set((await loadVisualResearch()).flatMap((r) => r.patterns))].sort()
}

// ───────── how Prism's file references map onto this studio ─────────

export const PRISM_ADAPTER = `How Prism runs inside Prismu
Prism below was written for a coding agent reading files. Here, its files are reached through tools:
- "prism-core/references/<name>.md" and "prism-core/skills/mobbin-visual-pattern-research/SKILL.md": call prism_reference with the file name (e.g. "wireframe", "mobbin-visual-pattern-research"). Load a reference only when the current output needs it, as Prism says.
- "tata-1mg-development-design-system.md" and "tata-1mg-development-design-system/design-system.html": the project's design system (the Design systems page). Its guide is included below when the project uses it. Call read_design_system with a section ("colors", "typography", "spacing", "corner-radius", "shadows", "buttons", "input-fields", "chips", "sku-cards", "actionbar", "page-header", "labs-home"…) to get that part of the component reference as exact specs, before building anything that uses it. With no arguments it lists every section and the approved asset URLs.
- "tata-1mg-development-design-system/assets/…": approved images are served at ${TATA_1MG_ASSET_BASE}… (e.g. ${RX_FALLBACK_IMAGE}); use those URLs in wireframe <img> tags.
- "visual-research/index.md", "catalog.json", "visual-research.html", "screenshots/": the Visual research page. Call search_visual_research to shortlist by pattern cluster or intent, then view_visual_research to actually inspect up to five screenshots.
- Mobbin: use the connector tools whose names start with "mobbin__" when the Mobbin connector is connected. If they are absent, record the Mobbin pass as skipped ("Mobbin isn't connected") and continue.
- A discovery question, direction choice or approval is always an ask_user call, never plain chat text.
- Prism's "ask at least one focused discovery question" applies once per brief, not to every message. A follow-up message about the same brief, an answer, or an instruction to proceed ("go ahead", "make the wireframe") is not a new request: act on it. Never ask anything listed under "Decisions the designer has already made"; build on those answers. If something is still unknown, make a sensible assumption and say so instead of asking again.
- A Prism wireframe is built on the canvas as one interactive HTML prototype: create_prototype (the plan plus the first 2–4 screens), then add_prototype_screens for the rest, linked with data-go / data-back / data-open, and revised with iterate_prototype. Represent interaction states as linked screens or overlays. Use create_wireframe only for a single standalone screen the designer asks for.
- Design Notes, insight packets and research findings go in the chat reply, or, when the designer asks for notes or they're long, in a notes document on the canvas (add_note, Markdown with ## headings) with a one-line summary in chat. Show Mobbin screenshots with Markdown images: ![App — screen](url).`
