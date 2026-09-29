import { memo, useEffect, useMemo, useRef } from "react"
import { Shapes as Figma, ImageIcon, MoreHorizontal, Sparkles, Radio, Package, Workflow as WorkflowIcon } from "@/components/ui/icons"
import type { FrameNode, Mark } from "@/lib/types"
import { buildSrcDoc } from "@/lib/wireframe"
import { allDesignSystems, wireframeVars } from "@/lib/design-systems"
import { WorkflowGraph } from "@/components/agents/workflow-graph"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SOURCE_ICON = { upload: ImageIcon, figma: Figma, agent: Sparkles, live: Radio, product: Package }

export const SEVERITY_COLOR: Record<string, string> = {
  critical: "var(--destructive)",
  major: "var(--ember)",
  minor: "oklch(0.72 0.14 75)",
  positive: "var(--ok)",
}

interface Props {
  frame: FrameNode
  marks: Mark[]
  selected: boolean
  zoom: number
  offset?: { dx: number; dy: number }
  onPointerDown: (e: React.PointerEvent, id: string) => void
  onPreview: (f: FrameNode) => void
  onDelete: (id: string) => void
  onAsk: (f: FrameNode) => void
  activeMark: string | null
  setActiveMark: (id: string | null) => void
}

export const FrameView = memo(function FrameView({ frame: f, marks, selected, zoom, offset, onPointerDown, onPreview, onDelete, onAsk, activeMark, setActiveMark }: Props) {
  const inv = 1 / zoom
  const Icon = f.type === "workflow" ? WorkflowIcon : SOURCE_ICON[f.source] ?? ImageIcon
  const x = f.x + (offset?.dx ?? 0)
  const y = f.y + (offset?.dy ?? 0)
  return (
    <div
      data-node={f.id}
      className="absolute"
      style={{ left: x, top: y, width: f.w, height: f.h }}
      onPointerDown={(e) => onPointerDown(e, f.id)}
    >
      {/* title row, kept at a constant screen size */}
      <div
        className="absolute left-0 flex items-center gap-1.5 whitespace-nowrap select-none"
        style={{ bottom: "100%", transform: `scale(${inv})`, transformOrigin: "0 100%", paddingBottom: 6, maxWidth: f.w * zoom + 40 }}
      >
        <Icon className={cn("size-3.5 shrink-0", f.source === "agent" ? "text-ember" : "text-muted-foreground")} />
        <span className={cn("truncate text-[12px] font-medium", selected ? "text-foreground" : "text-muted-foreground")}>{f.title}</span>
        {f.version ? (
          <span className={cn("tabular rounded-full px-1.5 py-px text-[10.5px] font-semibold", f.source === "agent" ? "bg-ember text-white" : "bg-foreground text-background")}>
            V{f.version}
          </span>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-muted-foreground hover:text-foreground hover:bg-accent ml-0.5 rounded p-0.5"
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Frame options"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onSelect={() => onAsk(f)}>Ask the agent about this</DropdownMenuItem>
            {f.type === "wireframe" && <DropdownMenuItem onSelect={() => onPreview(f)}>Open preview</DropdownMenuItem>}
            {f.type === "wireframe" && (
              <DropdownMenuItem onSelect={() => navigator.clipboard?.writeText(f.html ?? "").catch(() => {})}>Copy HTML</DropdownMenuItem>
            )}
            {f.type === "image" && <DropdownMenuItem onSelect={() => onPreview(f)}>View full size</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(f.id)}>
              Delete frame
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
          f.type === "workflow" ? "canvas-grid rounded-[16px]" : "bg-card",
          f.type === "wireframe" ? "rounded-[18px]" : f.type === "image" ? "rounded-[6px]" : "",
        )}
        style={{
          boxShadow: selected
            ? `0 0 0 ${2 * inv}px var(--pin), var(--elev-md)`
            : `0 0 0 ${1 * inv}px var(--border), var(--elev-sm)`,
        }}
      >
        {f.type === "workflow" && f.workflow ? <WorkflowGraph workflow={f.workflow} className="pointer-events-none" /> : f.type === "wireframe" ? <WireframeBody frame={f} /> : f.src ? <img src={f.src} alt={f.title} draggable={false} className="pointer-events-none h-full w-full object-cover object-top select-none" /> : null}

        {/* marks */}
        {marks.map((m) =>
          m.type === "annotation" ? (
            <div
              key={m.id}
              className="absolute"
              style={{
                left: `${m.x * 100}%`,
                top: `${m.y * 100}%`,
                width: `${(m.w ?? 0.1) * 100}%`,
                height: `${(m.h ?? 0.06) * 100}%`,
                border: `${2 * inv}px solid ${SEVERITY_COLOR[m.severity ?? "minor"]}`,
                background: activeMark === m.id ? "color-mix(in oklch, var(--ember) 10%, transparent)" : "transparent",
                borderRadius: 6 * inv,
              }}
            >
              <MarkBadge mark={m} inv={inv} active={activeMark === m.id} onClick={() => setActiveMark(activeMark === m.id ? null : m.id)} corner />
            </div>
          ) : (
            <div key={m.id} className="absolute" style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}>
              <MarkBadge mark={m} inv={inv} active={activeMark === m.id} onClick={() => setActiveMark(activeMark === m.id ? null : m.id)} />
            </div>
          ),
        )}
      </div>

      {f.changeSummary && selected && (
        <div
          className="text-muted-foreground absolute left-0 text-[12px] leading-snug"
          style={{ top: "100%", transform: `scale(${inv})`, transformOrigin: "0 0", width: Math.max(260, f.w * zoom), paddingTop: 8 }}
        >
          {f.changeSummary}
        </div>
      )}
    </div>
  )
})

function MarkBadge({ mark: m, inv, active, onClick, corner }: { mark: Mark; inv: number; active: boolean; onClick: () => void; corner?: boolean }) {
  const color = m.author === "user" ? "var(--pin)" : SEVERITY_COLOR[m.severity ?? "minor"]
  return (
    <div
      className="absolute"
      style={{ left: 0, top: 0, transform: `translate(${corner ? "-40%" : "-50%"}, ${corner ? "-40%" : "-100%"}) scale(${inv})`, transformOrigin: corner ? "0 0" : "50% 100%", zIndex: active ? 30 : 10 }}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={cn(
          "tabular flex size-6 items-center justify-center text-[11px] font-bold text-white shadow-sm ring-2 ring-white transition-transform hover:scale-110 dark:ring-black/40",
          corner ? "rounded-full" : "rounded-full rounded-bl-none",
        )}
        style={{ background: color }}
        aria-label={`${m.type} ${m.n}`}
      >
        {m.n}
      </button>
      {active && (
        <div
          className="bg-popover text-popover-foreground absolute top-7 left-0 w-64 rounded-xl border p-3.5 text-[12.5px] leading-relaxed shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="eyebrow mb-1 flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: color }} />
            {m.author === "agent" ? "Design Agent" : "You"} · {m.severity && m.author === "agent" ? m.severity : m.type}
          </div>
          {m.text}
          <DeleteMark id={m.id} />
        </div>
      )}
    </div>
  )
}

function DeleteMark({ id }: { id: string }) {
  const edit = useStore((s) => s.editCanvas)
  return (
    <button
      className="text-muted-foreground hover:text-destructive mt-2 block text-[11.5px] underline-offset-2 hover:underline"
      onClick={() => edit((d) => ({ ...d, marks: d.marks.filter((m) => m.id !== id) }))}
    >
      Resolve and remove
    </button>
  )
}

function WireframeBody({ frame }: { frame: FrameNode }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const edit = useStore((s) => s.editCanvas)
  const custom = useStore((s) => s.designSystems)
  const doc = useMemo(() => {
    const ds = allDesignSystems(custom).find((d) => d.id === frame.designSystemId)
    return buildSrcDoc(frame.html ?? "", wireframeVars(ds))
  }, [frame.html, frame.designSystemId, custom])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onLoad = () => {
      try {
        const h = el.contentDocument?.documentElement.scrollHeight ?? 0
        if (h > frame.h + 4 && h < 6000) {
          edit((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === frame.id ? { ...n, h } : n)) }), { record: false })
        }
      } catch {
        /* cross-origin in some sandboxes; keep the default height */
      }
    }
    el.addEventListener("load", onLoad)
    return () => el.removeEventListener("load", onLoad)
  }, [frame.id, frame.h, edit])
  return (
    <iframe
      ref={ref}
      title={frame.title}
      srcDoc={doc}
      sandbox="allow-same-origin"
      className="pointer-events-none block border-0 bg-white"
      style={{ width: frame.w, height: frame.h }}
      tabIndex={-1}
    />
  )
}
