import { useMemo } from "react"
import { MoreHorizontal, Pencil, Trash2, Workflow as WorkflowIcon, Layers } from "lucide-react"
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

export function ProjectMenu({ conv, onRename, className }: { conv: Conversation; onRename: () => void; className?: string }) {
  const del = useStore((s) => s.deleteConversation)
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
        <DropdownMenuItem variant="destructive" onSelect={() => del(conv.id)}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function projectMeta(conv: Conversation) {
  const frames = conv.canvas.nodes.filter((n) => n.kind === "frame").length
  return `${frames} frame${frames === 1 ? "" : "s"} · ${timeAgo(conv.updatedAt)}`
}
