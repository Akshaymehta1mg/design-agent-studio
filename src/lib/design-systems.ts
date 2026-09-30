import type { DesignSystem } from "./types"
import { TATA_1MG_GUIDE, TATA_1MG_REFERENCE_URL } from "./prism"

const T = 0

export const BUILTIN_DESIGN_SYSTEMS: DesignSystem[] = [
  {
    id: "ds_wireframe",
    name: "Wireframe",
    description: "Grayscale low-fidelity. Structure and copy first, no visual styling.",
    builtIn: true,
    source: "builtin",
    colors: [
      { name: "Ink", value: "#1d1d1f" },
      { name: "Secondary", value: "#5f5f64" },
      { name: "Line", value: "#e4e4e7" },
      { name: "Fill", value: "#f2f2f4" },
    ],
    font: "System sans",
    radius: 12,
    updatedAt: T,
    profile: `Colors
- Grayscale only: ink #1d1d1f, secondary #5f5f64, lines #e4e4e7, fills #f2f2f4
- Primary actions are solid ink; everything else outline or fill
Typography
- System sans; 24/700 titles, 18/650 section heads, 15/600 labels, 14/400 body
Spacing & shape
- 16px gutters, 8px rhythm, 12px radius cards, pill buttons and chips
Components
- Bars, cards, lists, chips, inputs, bottom sheets, image placeholders with a cross
Patterns
- One primary action per screen, pinned to the bottom on mobile
Voice
- Real, specific copy; sentence case`,
  },
  {
    id: "ds_shadcn",
    name: "shadcn/ui",
    description: "Neutral web app UI: zinc grays, 10px radius, Inter-style sans.",
    builtIn: true,
    source: "builtin",
    colors: [
      { name: "Primary", value: "#171717" },
      { name: "Muted", value: "#f5f5f5" },
      { name: "Border", value: "#e5e5e5" },
      { name: "Destructive", value: "#dc2626" },
    ],
    font: "Inter",
    radius: 10,
    updatedAt: T,
    profile: `Colors
- Neutral grays: background white, foreground #0a0a0a, primary #171717, muted #f5f5f5, border #e5e5e5, destructive #dc2626
Typography
- Inter or system sans; 30/700 page titles, 20/600 card titles, 14/400 body, 12/500 labels
Spacing & shape
- 24px page padding, 16px card padding, 10px radius, hairline borders, subtle shadows
Components
- Button (default, secondary, outline, ghost), Card, Input, Select, Tabs, Dialog, Sheet, Table, Badge, Dropdown menu, Sidebar
Patterns
- Sidebar + content layouts; forms in cards; destructive actions confirm in a dialog
Voice
- Plain, concise, sentence case`,
  },
  {
    id: "ds_ios",
    name: "iOS native",
    description: "Apple platform conventions: large titles, grouped lists, tab bars.",
    builtIn: true,
    source: "builtin",
    colors: [
      { name: "Label", value: "#000000" },
      { name: "Tint", value: "#007aff" },
      { name: "Grouped bg", value: "#f2f2f7" },
      { name: "Separator", value: "#c6c6c8" },
    ],
    font: "SF Pro",
    radius: 10,
    updatedAt: T,
    profile: `Colors
- System colors: label #000, secondary label #3c3c43 at 60%, tint #007aff, grouped background #f2f2f7, separators #c6c6c8
Typography
- SF Pro; Large Title 34/700, Title 2 22/700, Headline 17/600, Body 17/400, Footnote 13/400
Spacing & shape
- 16px margins, 44pt minimum touch targets, 10px grouped list radius
Components
- Navigation bar with large title, tab bar (up to 5), grouped inset lists, sheets with grabber, segmented controls, switches
Patterns
- Back navigation top-left; primary action top-right or in a bottom button; destructive actions in red
Voice
- Short, direct, title case for buttons`,
  },
]

BUILTIN_DESIGN_SYSTEMS.push({
  id: "ds_tata1mg",
  name: "Tata 1mg Dopamine",
  description: "Prism's canonical system: Dopamine foundations, Figtree, semantic colours and Tata 1mg source-faithful patterns.",
  builtIn: true,
  source: "builtin",
  colors: [
    { name: "Primary action", value: "#FF6F61" },
    { name: "Content primary", value: "#181A1F" },
    { name: "Content secondary", value: "#626A7A" },
    { name: "Background subtle", value: "#F7F8FA" },
    { name: "Divider", value: "#DDE2EB" },
    { name: "Success", value: "#308956" },
    { name: "Error", value: "#C50F1F" },
    { name: "Warning", value: "#BF9514" },
  ],
  font: "Figtree",
  radius: 12,
  referenceUrl: TATA_1MG_REFERENCE_URL,
  // Prototypes render on an iPhone 17.
  viewport: { w: 402, h: 874 },
  updatedAt: T,
  profile: TATA_1MG_GUIDE.replace(/^---\n[\s\S]*?\n---\n+/, ""),
})

export const DEFAULT_DESIGN_SYSTEM_ID = "ds_tata1mg"

export function allDesignSystems(custom: DesignSystem[]) {
  return [...BUILTIN_DESIGN_SYSTEMS, ...custom]
}

/** Override the wireframe helper palette so wireframes pick up the system's accent, radius and font. */
/** A short, prompt-ready digest of a design system for models with small request limits. */
export function designSystemDigest(ds: DesignSystem, maxProfile = 700): string {
  const profile = ds.profile.replace(/^---\n[\s\S]*?\n---\n+/, "").replace(/\n{3,}/g, "\n\n").trim()
  const cut = profile.length > maxProfile ? `${profile.slice(0, maxProfile).replace(/\s+\S*$/, "")}…` : profile
  return [
    `Design system: ${ds.name}${ds.font ? ` · font ${ds.font}` : ""}${ds.radius != null ? ` · radius ${ds.radius}px` : ""}`,
    ds.colors.length ? `Colours: ${ds.colors.map((c) => `${c.name} ${c.value}`).join(", ")}` : "",
    cut,
    ds.referenceUrl ? "Call read_design_system(section) for exact specs (colors, typography, spacing, buttons, input-fields, chips, sku-cards, actionbar, page-header…) before building with them." : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export function wireframeVars(ds?: DesignSystem): string {
  if (!ds || ds.id === "ds_wireframe") return ""
  const primary = ds.colors.find((c) => /primary|tint|accent|brand/i.test(c.name))?.value ?? ds.colors[0]?.value
  const vars = [primary && `--wf-accent:${primary}`, ds.radius !== undefined && `--wf-radius:${ds.radius}px`].filter(Boolean).join(";")
  const custom = ds.font && !/system|sf pro/i.test(ds.font)
  // Load the typeface from Google Fonts; a font Google doesn't have simply falls back to the system stack.
  const load = custom ? `@import url("https://fonts.googleapis.com/css2?family=${encodeURIComponent(ds.font!).replace(/%20/g, "+")}:wght@400..800&display=swap");` : ""
  const font = custom ? `body{font-family:"${ds.font}",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}` : ""
  return `${load}:root{${vars}}${font}`
}
