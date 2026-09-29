import type { DesignSystem } from "./types"

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

export function allDesignSystems(custom: DesignSystem[]) {
  return [...BUILTIN_DESIGN_SYSTEMS, ...custom]
}

/** Override the wireframe helper palette so wireframes pick up the system's accent, radius and font. */
export function wireframeVars(ds?: DesignSystem): string {
  if (!ds || ds.id === "ds_wireframe") return ""
  const primary = ds.colors.find((c) => /primary|tint|accent|brand/i.test(c.name))?.value ?? ds.colors[0]?.value
  const vars = [primary && `--wf-accent:${primary}`, ds.radius !== undefined && `--wf-radius:${ds.radius}px`].filter(Boolean).join(";")
  const font = ds.font && !/system/i.test(ds.font) ? `body{font-family:"${ds.font}",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}` : ""
  return `:root{${vars}}${font}`
}
