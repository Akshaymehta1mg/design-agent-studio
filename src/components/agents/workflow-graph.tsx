// Animated workflow graph, modelled on the evaluator-workflow pattern from aisdkagents.com:
// node cards with header/content/footer, flowing edges for the main path and dashed return
// edges for loops, plus a simulated run that walks the graph (including one pass round each loop).
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Check, Diamond, Flag, Play, RotateCcw, Workflow as WorkflowIcon, Maximize2 } from "lucide-react"
import type { Workflow, WorkflowEdge, WorkflowNode } from "@/lib/types"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

const PAD = 28

interface Placed extends WorkflowNode {
  x: number
  y: number
  depth: number
}
interface PlacedEdge extends WorkflowEdge {
  id: string
  d: string
  loop: boolean
  lx: number
  ly: number
}

type Dir = "horizontal" | "vertical"
const SIZES = {
  full: { w: 232, h: 118, gx: 76, gy: 34 },
  compact: { w: 196, h: 58, gx: 40, gy: 22 },
}

export function layoutWorkflow(wf: Workflow, dir: Dir = "horizontal", size: keyof typeof SIZES = "full") {
  const { w: NW, h: NH, gx: GAP_D, gy: GAP_C } = SIZES[size]
  // depth axis = x when horizontal, y when vertical; nodes along the cross axis stack within a depth
  const DW = dir === "horizontal" ? NW : NH
  const CW = dir === "horizontal" ? NH : NW
  const ids = new Set(wf.nodes.map((n) => n.id))
  const edges = wf.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
  const n = wf.nodes.length
  const depth: Record<string, number> = Object.fromEntries(wf.nodes.map((x) => [x.id, 0]))
  const main = edges.filter((e) => e.kind !== "loop")
  for (let i = 0; i < n; i++) {
    let changed = false
    for (const e of main) {
      if (depth[e.to] < depth[e.from] + 1 && depth[e.from] + 1 < n) {
        depth[e.to] = depth[e.from] + 1
        changed = true
      }
    }
    if (!changed) break
  }
  const isLoop = (e: WorkflowEdge) => e.kind === "loop" || depth[e.to] <= depth[e.from]
  const hasLoopOut = new Set(edges.filter(isLoop).map((e) => e.from))
  const cols: WorkflowNode[][] = []
  for (const node of wf.nodes) (cols[depth[node.id]] ??= []).push(node)
  cols.forEach((c) => c?.sort((a, b) => Number(hasLoopOut.has(b.id)) - Number(hasLoopOut.has(a.id))))
  const loopSpace = edges.some(isLoop) ? (dir === "horizontal" ? 64 : 70) : 0
  const maxRows = Math.max(1, ...cols.map((c) => c?.length ?? 0))
  const crossSpan = maxRows * CW + (maxRows - 1) * GAP_C
  const depthSpan = cols.length * DW + (cols.length - 1) * GAP_D
  const placed: Record<string, Placed> = {}
  cols.forEach((col, ci) => {
    if (!col) return
    const colSpan = col.length * CW + (col.length - 1) * GAP_C
    const start = PAD + (dir === "horizontal" ? loopSpace : 0) + (crossSpan - colSpan) / 2
    col.forEach((node, ri) => {
      const d = PAD + ci * (DW + GAP_D)
      const c = start + ri * (CW + GAP_C)
      placed[node.id] = { ...node, depth: ci, x: dir === "horizontal" ? d : c, y: dir === "horizontal" ? c : d }
    })
  })
  const width = dir === "horizontal" ? PAD * 2 + depthSpan : PAD * 2 + crossSpan + loopSpace
  const height = dir === "horizontal" ? PAD * 2 + loopSpace + crossSpan : PAD * 2 + depthSpan
  const pEdges: PlacedEdge[] = edges.map((e, i) => {
    const a = placed[e.from]
    const b = placed[e.to]
    const loop = isLoop(e)
    if (dir === "horizontal") {
      if (!loop) {
        const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2
        const mx = (x1 + x2) / 2
        return { ...e, id: `e${i}`, loop, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, lx: mx, ly: (y1 + y2) / 2 - 8 }
      }
      const x1 = a.x + NW / 2, y1 = a.y, x2 = b.x + NW / 2, y2 = b.y
      const top = Math.min(y1, y2) - loopSpace + 14
      return { ...e, id: `e${i}`, loop, d: `M ${x1} ${y1} C ${x1} ${top}, ${x2} ${top}, ${x2} ${y2}`, lx: (x1 + x2) / 2, ly: top + 14 }
    }
    if (!loop) {
      const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y
      const my = (y1 + y2) / 2
      return { ...e, id: `e${i}`, loop, d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`, lx: (x1 + x2) / 2 + (x1 === x2 ? 0 : 0), ly: my }
    }
    const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x + NW, y2 = b.y + NH / 2
    const right = Math.max(x1, x2) + loopSpace - 14
    return { ...e, id: `e${i}`, loop, d: `M ${x1} ${y1} C ${right} ${y1}, ${right} ${y2}, ${x2} ${y2}`, lx: right - 22, ly: (y1 + y2) / 2 }
  })
  // topological order (by depth, loop sources first within a column)
  const order = cols.flat().filter(Boolean).map((x) => x.id)
  // simulated run: walk the order; the first time a loop source runs, go round the loop once
  const seq: { node: string; via?: string }[] = []
  const looped = new Set<string>()
  const incoming = (to: string) => pEdges.find((e) => !e.loop && e.to === to)?.id
  for (let i = 0; i < order.length; i++) {
    const id = order[i]
    seq.push({ node: id, via: incoming(id) })
    const back = pEdges.find((e) => e.loop && e.from === id && !looped.has(e.id))
    if (back) {
      looped.add(back.id)
      const from = order.indexOf(back.to)
      if (from >= 0 && from < i) {
        seq.push({ node: back.to, via: back.id })
        for (let j = from + 1; j < i; j++) seq.push({ node: order[j], via: incoming(order[j]) })
      }
    }
  }
  return { nodes: Object.values(placed), edges: pEdges, width, height, seq, order, nodeW: NW, nodeH: NH, dir }
}

const KIND_ICON = { start: Play, decision: Diamond, end: Flag, step: null } as const

export function WorkflowGraph({ workflow, runKey = 0, autoRun = true, compact = false, className }: { workflow: Workflow; runKey?: number; autoRun?: boolean; compact?: boolean; className?: string }) {
  const reduce = useReducedMotion() ?? false
  const L = useMemo(() => layoutWorkflow(workflow, compact ? "vertical" : "horizontal", compact ? "compact" : "full"), [workflow, compact])
  const [step, setStep] = useState(autoRun ? -1 : L.seq.length)
  const timer = useRef<number>(0)

  useEffect(() => {
    if (!autoRun || reduce) {
      setStep(L.seq.length)
      return
    }
    setStep(-1)
    const appear = 350 + L.nodes.length * 70
    let i = -1
    const tick = () => {
      i++
      setStep(i)
      if (i < L.seq.length) timer.current = window.setTimeout(tick, 720)
    }
    timer.current = window.setTimeout(tick, appear)
    return () => clearTimeout(timer.current)
  }, [runKey, autoRun, reduce, L])

  const done = new Set<string>()
  L.seq.slice(0, Math.max(0, step)).forEach((s) => done.add(s.node))
  const running = step >= 0 && step < L.seq.length ? L.seq[step] : null
  const finished = step >= L.seq.length
  const orderIndex = Object.fromEntries(L.order.map((id, i) => [id, i]))

  return (
    <div className={cn("relative", className)} style={{ width: L.width, height: L.height }}>
      <svg className="absolute inset-0 overflow-visible" width={L.width} height={L.height} aria-hidden>
        <defs>
          <marker id="wf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-foreground)" opacity="0.6" />
          </marker>
          <marker id="wf-arrow-ember" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ember)" />
          </marker>
        </defs>
        {L.edges.map((e, i) => {
          const active = running?.via === e.id
          const traversed = e.loop ? done.has(e.to) && L.seq.some((s, k) => s.via === e.id && k < step) : done.has(e.to) || (finished && done.has(e.from))
          return (
            <g key={e.id}>
              <motion.path
                d={e.d}
                fill="none"
                stroke={active || traversed ? "var(--ember)" : "var(--muted-foreground)"}
                strokeOpacity={active ? 1 : traversed ? 0.75 : 0.4}
                strokeWidth={active ? 2 : 1.5}
                strokeDasharray={e.loop ? "5 6" : undefined}
                markerEnd={active || traversed ? "url(#wf-arrow-ember)" : "url(#wf-arrow)"}
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: EASE_OUT, delay: reduce ? 0 : 0.25 + i * 0.05 }}
              />
              {!e.loop && (
                <path d={e.d} fill="none" stroke="var(--ember)" strokeWidth={1.5} strokeDasharray="4 10" className={cn("wf-flow", !(active || (finished && traversed)) && "opacity-0")} />
              )}
              {active && !reduce && (
                <circle r="4.5" fill="var(--ember)">
                  <animateMotion dur="0.65s" path={e.d} fill="freeze" />
                </circle>
              )}
              {e.label && (
                <foreignObject x={e.lx - 60} y={e.ly - 11} width={120} height={22} className="overflow-visible">
                  <div className="flex justify-center">
                    <span className={cn("bg-background rounded-full border px-1.5 py-px text-[10.5px] font-medium whitespace-nowrap", e.loop ? "text-ember border-ember/40" : "text-muted-foreground")}>{e.label}</span>
                  </div>
                </foreignObject>
              )}
            </g>
          )
        })}
      </svg>

      {L.nodes.map((n) => {
        const isRunning = running?.node === n.id
        const isDone = done.has(n.id) && !isRunning
        const Icon = KIND_ICON[n.kind ?? "step"]
        return (
          <motion.div
            key={n.id}
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: reduce ? 0 : orderIndex[n.id] * 0.07 }}
            className={cn(
              "bg-card absolute flex flex-col overflow-hidden rounded-xl border text-left shadow-sm transition-[box-shadow,border-color] duration-300",
              isRunning && "border-ember shadow-[0_0_0_4px_var(--ember-soft)]",
              isDone && "border-ember/40",
            )}
            style={{ left: n.x, top: n.y, width: L.nodeW, height: L.nodeH }}
          >
            {/* handles */}
            {L.dir === "horizontal" ? (
              <>
                <span className="bg-background border-border absolute top-1/2 -left-[5px] size-2.5 -translate-y-1/2 rounded-full border" />
                <span className="bg-background border-border absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rounded-full border" />
              </>
            ) : (
              <>
                <span className="bg-background border-border absolute -top-[5px] left-1/2 size-2.5 -translate-x-1/2 rounded-full border" />
                <span className="bg-background border-border absolute -bottom-[5px] left-1/2 size-2.5 -translate-x-1/2 rounded-full border" />
              </>
            )}
            <div className={cn("flex items-start gap-2 px-3 py-2", !compact && "bg-muted/60 border-b")}>
              {Icon && <Icon className={cn("mt-0.5 size-3.5 shrink-0", n.kind === "decision" ? "text-ember" : "text-muted-foreground")} />}
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[12.5px] font-semibold">{n.title}</div>
                {n.description && <div className="text-muted-foreground truncate text-[11px]">{n.description}</div>}
              </div>
              <span className="grid size-4 shrink-0 place-items-center">
                {isRunning ? (
                  <span className="bg-ember pulse-ring size-2 rounded-full" />
                ) : isDone ? (
                  <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-ember grid size-4 place-items-center rounded-full text-white">
                    <Check className="size-2.5" strokeWidth={3.5} />
                  </motion.span>
                ) : null}
              </span>
            </div>
            {!compact && n.content && <div className="line-clamp-2 min-h-0 px-3 pt-2 text-[11.5px] leading-snug">{n.content}</div>}
            {!compact && n.footer && <div className="text-muted-foreground mt-auto truncate px-3 pb-2 text-[10.5px]">{n.footer}</div>}
          </motion.div>
        )
      })}
    </div>
  )
}

/** Compact card for the chat: scales the graph to fit, with replay and a jump to the canvas. */
export function WorkflowCard({ workflow, onOpen }: { workflow: Workflow; onOpen?: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  const [runKey, setRunKey] = useState(0)
  const L = useMemo(() => layoutWorkflow(workflow, "vertical", "compact"), [workflow])
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale = Math.min(1, w / L.width)
  const loops = L.edges.filter((e) => e.loop).length
  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <div className="flex h-11 items-center gap-2.5 px-3.5">
        <span className="bg-ember-soft text-ember grid size-6 place-items-center rounded-md">
          <WorkflowIcon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13.5px] font-medium">{workflow.title}</div>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {workflow.nodes.length} steps{loops ? ` · ${loops} loop${loops > 1 ? "s" : ""}` : ""}
        </span>
        <button onClick={() => setRunKey((k) => k + 1)} className="text-muted-foreground hover:text-foreground hover:bg-accent grid size-7 place-items-center rounded-md" aria-label="Replay run">
          <RotateCcw className="size-3.5" />
        </button>
        {onOpen && (
          <button onClick={onOpen} className="text-muted-foreground hover:text-foreground hover:bg-accent grid size-7 place-items-center rounded-md" aria-label="View on canvas">
            <Maximize2 className="size-3.5" />
          </button>
        )}
      </div>
      <div ref={box} className="canvas-grid relative overflow-hidden border-t" style={{ height: L.height * scale, backgroundSize: "18px 18px" }}>
        <div className="absolute top-0 left-1/2 origin-top" style={{ transform: `translateX(-50%) scale(${scale})`, width: L.width }}>
          <WorkflowGraph workflow={workflow} runKey={runKey} compact />
        </div>
      </div>
      {workflow.description && <p className="text-muted-foreground border-t px-3.5 py-2.5 text-[12.5px] leading-snug">{workflow.description}</p>}
    </div>
  )
}
