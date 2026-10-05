import type { ComponentType } from "react"
import {
  FileStack,
  FileText,
  GalleryHorizontalEnd,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquareText,
  Palette,
  Plug,
  Radio,
  Settings2,
  Triangle,
  Workflow,
  type IconProps,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

/**
 * Colored type tiles, so a kind of thing reads at a glance wherever it shows up:
 * the Home type chips, starter cards, project cards and the sidebar.
 */
export type TileKind =
  | "critique"
  | "wireframe"
  | "flow"
  | "live"
  | "screens"
  | "home"
  | "files"
  | "context"
  | "connectors"
  | "design-systems"
  | "prism"
  | "visual-research"
  | "settings"

const TILES: Record<TileKind, { icon: ComponentType<IconProps>; bg: string }> = {
  critique: { icon: MessageSquareText, bg: "bg-amber-500" },
  wireframe: { icon: LayoutDashboard, bg: "bg-violet-500" },
  flow: { icon: Workflow, bg: "bg-emerald-500" },
  live: { icon: Radio, bg: "bg-rose-500" },
  screens: { icon: ImageIcon, bg: "bg-sky-500" },
  home: { icon: Home, bg: "bg-slate-700 dark:bg-slate-500" },
  files: { icon: FileStack, bg: "bg-blue-500" },
  context: { icon: FileText, bg: "bg-amber-500" },
  connectors: { icon: Plug, bg: "bg-emerald-500" },
  "design-systems": { icon: Palette, bg: "bg-pink-500" },
  prism: { icon: Triangle, bg: "bg-violet-600" },
  "visual-research": { icon: GalleryHorizontalEnd, bg: "bg-sky-500" },
  settings: { icon: Settings2, bg: "bg-slate-500" },
}

export function TypeTile({ kind, size = 18, className }: { kind: TileKind; size?: number; className?: string }) {
  return <IconTile icon={TILES[kind].icon} bg={TILES[kind].bg} size={size} className={className} />
}

export function IconTile({ icon: Icon, bg, size = 18, className }: { icon: ComponentType<IconProps>; bg: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-grid shrink-0 place-items-center text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_1px_1px_rgb(0_0_0/0.08)]", bg, className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
    >
      <Icon style={{ width: size * 0.64, height: size * 0.64 }} strokeWidth={2.2} />
    </span>
  )
}

/** Figma's own mark, in its colors. */
export function FigmaLogo({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 38 57" width={(size * 38) / 57} height={size} className={className} aria-hidden>
      <path fill="#1ABCFE" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
      <path fill="#0ACF83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
      <path fill="#FF7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
      <path fill="#F24E1E" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
      <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
    </svg>
  )
}
