import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { MoreHorizontal, Pencil, Star, Trash2, Workflow as WorkflowIcon, Layers } from "@/components/ui/icons"
import { TypeTile, type TileKind } from "@/components/type-icon"
import type { Conversation, FrameNode } from "@/lib/types"
import { useStore } from "@/lib/store"
import { buildSrcDoc } from "@/lib/wireframe"
import { allDesignSystems, wireframeVars } from "@/lib/design-systems"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function timeAgo(t: number) {
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** A tiny, static render of one frame. */
export function FrameMini({ f, height }: { f: FrameNode; height: number }) {
  const custom = useStore((s) => s.designSystems)
  const scale = height / f.h
  const doc = useMemo(
    () => (f.type === "wireframe" ? buildSrcDoc(f.html ?? "", wireframeVars(allDesignSystems(custom).find((d) => d.id === f.designSystemId))) : ""),
    [f.type, f.html, f.designSystemId, custom],
  )
  const w = Math.min(f.w * scale, height * 1.6)
  if (f.type === "workflow")
    return (
      <div className="bg-background text-muted-foreground grid shrink-0 place-items-center rounded-md border" style={{ width: height * 1.3, height }}>
        <WorkflowIcon className="size-5" />
      </div>
    )
  return (
    <div className="bg-background relative shrink-0 overflow-hidden rounded-md border shadow-xs" style={{ width: w, height }}>
      {f.type === "wireframe" ? (
        <iframe title="" srcDoc={doc} sandbox="" tabIndex={-1} className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-white" style={{ width: f.w, height: f.h, transform: `scale(${scale})` }} />
      ) : f.src ? (
        <img src={f.src} alt="" className="h-full w-full object-cover object-top" draggable={false} />
      ) : null}
    </div>
  )
}

export function ProjectThumb({ conv, height = 150 }: { conv: Conversation; height?: number }) {
  const frames = conv.canvas.nodes.filter((n): n is FrameNode => n.kind === "frame")
  const shown = [...frames].sort((a, b) => a.y - b.y || a.x - b.x).slice(0, 3)
  return (
    <div className="bg-muted flex items-end justify-center gap-2 overflow-hidden px-4 pt-5" style={{ height: height + 20 }}>
      {shown.length ? (
        shown.map((f) => <FrameMini key={f.id} f={f} height={height} />)
      ) : (
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1.5 pb-5 text-[12.5px]">
          <Layers className="size-5" />
          Empty canvas
        </div>
      )}
    </div>
  )
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** One frame filling a mosaic cell: scaled to the cell's width, top-aligned. */
function FrameCell({ f, className }: { f: FrameNode; className?: string }) {
  const custom = useStore((s) => s.designSystems)
  const [ref, w] = useWidth<HTMLDivElement>()
  const doc = useMemo(
    () => (f.type === "wireframe" ? buildSrcDoc(f.html ?? "", wireframeVars(allDesignSystems(custom).find((d) => d.id === f.designSystemId))) : ""),
    [f.type, f.html, f.designSystemId, custom],
  )
  const scale = w && f.w ? w / f.w : 0
  return (
    <div ref={ref} className={cn("bg-background relative min-h-0 overflow-hidden rounded-[10px] border shadow-xs", className)}>
      {f.type === "workflow" ? (
        <div className="grid h-full place-items-center bg-emerald-500/8">
          <TypeTile kind="flow" size={26} />
        </div>
      ) : f.type === "wireframe" ? (
        scale > 0 && <iframe title="" srcDoc={doc} sandbox="" tabIndex={-1} loading="lazy" className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-white" style={{ width: f.w, height: f.h, transform: `scale(${scale})` }} />
      ) : f.src ? (
        <img src={f.src} alt="" className="h-full w-full object-cover object-top" draggable={false} loading="lazy" />
      ) : null}
      {f.version && f.version > 1 ? <span className="bg-background/90 absolute right-1.5 bottom-1.5 rounded-md border px-1 text-[10px] font-semibold tabular-nums shadow-xs">V{f.version}</span> : null}
    </div>
  )
}

/** Up to four of the project's newest frames, laid out as a mosaic. */
export function ProjectMosaic({ conv }: { conv: Conversation }) {
  const frames = conv.canvas.nodes
    .filter((n): n is FrameNode => n.kind === "frame")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4)
  const n = frames.length
  return (
    <div className="bg-muted/70 aspect-[16/10] p-2">
      {n === 0 ? (
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed text-[12.5px]">
          <Layers className="size-5" />
          Empty canvas
        </div>
      ) : (
        <div className={cn("grid h-full gap-1.5", n === 1 ? "grid-cols-1" : n === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2")}>
          {frames.map((f, i) => (
            <FrameCell key={f.id} f={f} className={n === 3 && i === 0 ? "row-span-2" : undefined} />
          ))}
        </div>
      )}
    </div>
  )
}

/** What a project mostly holds, for its colored tile. */
export function projectKind(conv: Conversation): TileKind {
  const types = new Set(conv.canvas.nodes.filter((n): n is FrameNode => n.kind === "frame").map((f) => f.type))
  return types.has("wireframe") ? "wireframe" : types.has("workflow") ? "flow" : types.has("image") ? "critique" : "files"
}

export function StarButton({ conv, className }: { conv: Conversation; className?: string }) {
  const update = useStore((s) => s.updateConversation)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        update(conv.id, (c) => ({ ...c, starred: !c.starred }))
      }}
      aria-pressed={!!conv.starred}
      aria-label={conv.starred ? "Remove from favorites" : "Add to favorites"}
      className={cn("hover:bg-accent grid size-7 place-items-center rounded-md transition-colors", conv.starred ? "text-amber-500" : "text-muted-foreground hover:text-foreground", className)}
    >
      <StarGlyph filled={!!conv.starred} />
    </button>
  )
}

export function StarGlyph({ filled, className = "size-4" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round">
      <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z" />
    </svg>
  )
}

export function ProjectMenu({ conv, onRename, className }: { conv: Conversation; onRename: () => void; className?: string }) {
  const del = useStore((s) => s.deleteConversation)
  const update = useStore((s) => s.updateConversation)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className={cn("text-muted-foreground hover:text-foreground hover:bg-accent grid size-7 place-items-center rounded-md", className)} aria-label="Project options">
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onRename}>
          <Pencil /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => update(conv.id, (c) => ({ ...c, starred: !c.starred }))}>
          <Star /> {conv.starred ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => del(conv.id)}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function projectMeta(conv: Conversation) {
  const frames = conv.canvas.nodes.filter((n): n is FrameNode => n.kind === "frame")
  const v = Math.max(0, ...frames.map((f) => f.version ?? 0))
  return [v > 1 ? `V${v}` : null, `${frames.length} frame${frames.length === 1 ? "" : "s"}`, `edited ${timeAgo(conv.updatedAt)}`].filter(Boolean).join(" · ")
}
