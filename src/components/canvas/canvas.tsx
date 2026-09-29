import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { Hand, ImagePlus, MessageCircle, Minus, MousePointer2, Plus, Redo2, StickyNote, Undo2, Maximize, Upload } from "@/components/ui/icons"
import type { CanvasDoc, CanvasNode, FrameNode, Viewport } from "@/lib/types"
import { useStore, uid, type Tool } from "@/lib/store"
import { addImageFiles, addMarks } from "@/lib/canvas-actions"
import { buildSrcDoc } from "@/lib/wireframe"
import { allDesignSystems, wireframeVars } from "@/lib/design-systems"
import { cn } from "@/lib/utils"
import { FrameView } from "./frame-view"
import { NoteView } from "./note-view"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Kbd } from "@/components/ui/kbd"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"

type Drag =
  | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { kind: "move"; sx: number; sy: number; ids: string[]; moved: boolean }
  | { kind: "marquee"; sx: number; sy: number; ex: number; ey: number; additive: boolean }

const MIN_Z = 0.08
const MAX_Z = 3

export function Canvas({ onAskAbout }: { onAskAbout: (f: FrameNode) => void }) {
  // Subscribe to the canvas only; the conversation object changes with every chat message.
  const active = (s: ReturnType<typeof useStore.getState>) => s.conversations.find((c) => c.id === s.activeId) ?? s.conversations[0]
  const convId = useStore((s) => active(s).id)
  const doc = useStore((s) => active(s).canvas)
  // Select only what the canvas needs, so streamed chat updates don't re-render it.
  const { selection, select, tool, setTool, editCanvas, undo, redo, setViewport, focus } = useStore(
    useShallow((s) => ({ selection: s.selection, select: s.select, tool: s.tool, setTool: s.setTool, editCanvas: s.editCanvas, undo: s.undo, redo: s.redo, setViewport: s.setViewport, focus: s.focus })),
  )
  const history = useStore((s) => s.history[convId])
  const wrap = useRef<HTMLDivElement>(null)
  const [vp, setVp] = useState<Viewport>(doc.viewport)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [offset, setOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const [space, setSpace] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [activeMark, setActiveMark] = useState<string | null>(null)
  const [preview, setPreview] = useState<FrameNode | null>(null)
  const [pendingComment, setPendingComment] = useState<{ frameId: string; x: number; y: number; sx: number; sy: number } | null>(null)
  const [newNoteId, setNewNoteId] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Reset the local viewport when switching conversations.
  useEffect(() => {
    setVp(doc.viewport)
    setActiveMark(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId])

  // Persist the viewport lazily.
  useEffect(() => {
    const t = setTimeout(() => setViewport(vp), 400)
    return () => clearTimeout(t)
  }, [vp, setViewport])

  const toWorld = useCallback(
    (cx: number, cy: number) => {
      const r = wrap.current!.getBoundingClientRect()
      return { x: (cx - r.left - vp.x) / vp.zoom, y: (cy - r.top - vp.y) / vp.zoom }
    },
    [vp],
  )

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setVp((v) => {
      const r = wrap.current!.getBoundingClientRect()
      const px = cx !== undefined ? cx - r.left : r.width / 2
      const py = cy !== undefined ? cy - r.top : r.height / 2
      const zoom = Math.min(MAX_Z, Math.max(MIN_Z, v.zoom * factor))
      const k = zoom / v.zoom
      return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k }
    })
  }, [])

  const fitTo = useCallback((nodes: CanvasNode[], maxZoom = 1) => {
    if (!nodes.length || !wrap.current) return
    const r = wrap.current.getBoundingClientRect()
    const minX = Math.min(...nodes.map((n) => n.x))
    const minY = Math.min(...nodes.map((n) => n.y))
    const maxX = Math.max(...nodes.map((n) => n.x + n.w))
    const maxY = Math.max(...nodes.map((n) => n.y + n.h))
    const pad = 80
    const zoom = Math.min(maxZoom, Math.max(MIN_Z, Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2 - 60) / (maxY - minY))))
    setAnimating(true)
    setVp({ zoom, x: (r.width - (maxX - minX) * zoom) / 2 - minX * zoom, y: (r.height - (maxY - minY) * zoom) / 2 - minY * zoom - 20 })
    setTimeout(() => setAnimating(false), 450)
  }, [])

  // Focus requests (from chat action chips and new agent output).
  useEffect(() => {
    if (!focus) return
    const n = doc.nodes.find((x) => x.id === focus.id)
    if (n) fitTo([n], 0.9)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.t])

  // Wheel: pinch / ctrl+wheel zooms, plain wheel pans (Figma-style).
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest("[data-scrollable]")) return
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY)
      else setVp((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [zoomAt])

  // Keyboard shortcuts.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const mod = e.metaKey || e.ctrlKey
      if (e.code === "Space") {
        setSpace(true)
        e.preventDefault()
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key === "0") {
        e.preventDefault()
        fitTo(useStore.getState().conversations.find((c) => c.id === convId)!.canvas.nodes)
      } else if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault()
        zoomAt(1.2)
      } else if (mod && e.key === "-") {
        e.preventDefault()
        zoomAt(1 / 1.2)
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault()
        select(doc.nodes.map((n) => n.id))
      } else if (!mod && (e.key === "Delete" || e.key === "Backspace") && selection.length) {
        e.preventDefault()
        const ids = new Set(selection)
        editCanvas((d) => ({ ...d, nodes: d.nodes.filter((n) => !ids.has(n.id)), marks: d.marks.filter((m) => !ids.has(m.frameId)) }))
        select([])
      } else if (e.key === "Escape") {
        select([])
        setActiveMark(null)
        setPendingComment(null)
        setTool("select")
      } else if (!mod) {
        const map: Record<string, Tool> = { v: "select", h: "hand", n: "note", c: "comment" }
        const t = map[e.key.toLowerCase()]
        if (t) setTool(t)
      }
    }
    const up = (e: KeyboardEvent) => e.code === "Space" && setSpace(false)
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [selection, doc.nodes, convId, undo, redo, select, editCanvas, setTool, fitTo, zoomAt])

  // Paste images from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (useStore.getState().route !== "project" || useStore.getState().mode !== "canvas") return
      const t = e.target as HTMLElement | null
      if (t && /INPUT|TEXTAREA/.test(t.tagName)) return
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"))
      if (files.length) {
        e.preventDefault()
        addImageFiles(convId, files)
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [convId])

  const panning = tool === "hand" || space

  const onBackgroundDown = (e: React.PointerEvent) => {
    if (e.button === 2) return
    setActiveMark(null)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (panning || e.button === 1) {
      setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y })
      return
    }
    if (tool === "note") {
      const p = toWorld(e.clientX, e.clientY)
      const id = uid("n_")
      editCanvas((d) => ({ ...d, nodes: [...d.nodes, { id, kind: "note", x: p.x - 20, y: p.y - 20, w: 240, h: 150, text: "", author: "user", createdAt: Date.now() }] }))
      setNewNoteId(id)
      select([id])
      setTool("select")
      return
    }
    setPendingComment(null)
    setDrag({ kind: "marquee", sx: e.clientX, sy: e.clientY, ex: e.clientX, ey: e.clientY, additive: e.shiftKey })
    if (!e.shiftKey) select([])
  }

  const onNodeDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (e.button === 2) return
      e.stopPropagation()
      wrap.current?.setPointerCapture(e.pointerId)
      if (panning || e.button === 1) {
        setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y })
        return
      }
      if (tool === "comment") {
        const node = doc.nodes.find((n) => n.id === id)
        if (node?.kind === "frame") {
          const p = toWorld(e.clientX, e.clientY)
          const r = wrap.current!.getBoundingClientRect()
          setPendingComment({ frameId: id, x: (p.x - node.x) / node.w, y: (p.y - node.y) / node.h, sx: e.clientX - r.left, sy: e.clientY - r.top })
        }
        return
      }
      let ids = selection
      if (e.shiftKey) ids = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]
      else if (!selection.includes(id)) ids = [id]
      select(ids)
      setDrag({ kind: "move", sx: e.clientX, sy: e.clientY, ids, moved: false })
    },
    [panning, vp, tool, doc.nodes, selection, select, toWorld],
  )

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    if (drag.kind === "pan") setVp((v) => ({ ...v, x: drag.vx + e.clientX - drag.sx, y: drag.vy + e.clientY - drag.sy }))
    else if (drag.kind === "move") {
      const dx = (e.clientX - drag.sx) / vp.zoom
      const dy = (e.clientY - drag.sy) / vp.zoom
      if (!drag.moved && Math.hypot(dx, dy) * vp.zoom < 3) return
      if (!drag.moved) setDrag({ ...drag, moved: true })
      setOffset({ dx, dy })
    } else if (drag.kind === "marquee") setDrag({ ...drag, ex: e.clientX, ey: e.clientY })
  }

  const onUp = () => {
    if (!drag) return
    if (drag.kind === "move" && drag.moved && (offset.dx || offset.dy)) {
      const ids = new Set(drag.ids)
      const { dx, dy } = offset
      editCanvas((d) => ({ ...d, nodes: d.nodes.map((n) => (ids.has(n.id) ? { ...n, x: Math.round(n.x + dx), y: Math.round(n.y + dy) } : n)) }))
    } else if (drag.kind === "marquee") {
      const a = toWorld(Math.min(drag.sx, drag.ex), Math.min(drag.sy, drag.ey))
      const b = toWorld(Math.max(drag.sx, drag.ex), Math.max(drag.sy, drag.ey))
      if (Math.abs(drag.ex - drag.sx) > 4 || Math.abs(drag.ey - drag.sy) > 4) {
        const hit = doc.nodes.filter((n) => n.x < b.x && n.x + n.w > a.x && n.y < b.y && n.y + n.h > a.y).map((n) => n.id)
        select(drag.additive ? [...new Set([...selection, ...hit])] : hit)
      }
    }
    setOffset({ dx: 0, dy: 0 })
    setDrag(null)
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDropping(false)
    const files = [...e.dataTransfer.files]
    if (!files.some((f) => f.type.startsWith("image/"))) {
      toast.error("Drop PNG or JPG images. For documents, use Upload context in the chat.")
      return
    }
    await addImageFiles(convId, files, toWorld(e.clientX, e.clientY))
  }

  const deleteNode = useCallback(
    (id: string) => {
      editCanvas((d: CanvasDoc) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== id), marks: d.marks.filter((m) => m.frameId !== id) }))
      select([])
    },
    [editCanvas, select],
  )

  const marksByFrame = useMemo(() => {
    const m = new Map<string, typeof doc.marks>()
    for (const k of doc.marks) m.set(k.frameId, [...(m.get(k.frameId) ?? []), k])
    return m
  }, [doc.marks])

  const selSet = useMemo(() => new Set(selection), [selection])
  const moving = drag?.kind === "move" && drag.moved ? new Set(drag.ids) : null

  // lineage connectors (V1 → V2 → V3)
  const connectors = useMemo(() => {
    const byId = new Map(doc.nodes.map((n) => [n.id, n]))
    return doc.nodes
      .filter((n): n is FrameNode => n.kind === "frame" && !!n.parentId && byId.has(n.parentId))
      .map((child) => {
        const parent = byId.get(child.parentId!)!
        const o = (id: string) => (moving?.has(id) ? offset : { dx: 0, dy: 0 })
        const x1 = parent.x + parent.w + o(parent.id).dx
        const y1 = parent.y + 40 + o(parent.id).dy
        const x2 = child.x + o(child.id).dx
        const y2 = child.y + 40 + o(child.id).dy
        const mx = (x1 + x2) / 2
        return { id: child.id, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` }
      })
  }, [doc.nodes, moving, offset])

  const r = wrap.current?.getBoundingClientRect()

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={wrap}
        className={cn("canvas-grid absolute inset-0 touch-none select-none", panning ? (drag?.kind === "pan" ? "cursor-grabbing" : "cursor-grab") : tool === "note" || tool === "comment" ? "cursor-crosshair" : "cursor-default")}
        onPointerDown={onBackgroundDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDragOver={(e) => {
          e.preventDefault()
          setDropping(true)
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={onDrop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`, transition: animating ? "transform 420ms cubic-bezier(.2,.8,.2,1)" : undefined }}
        >
          <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1 }}>
            {connectors.map((c) => (
              <path key={c.id} d={c.d} fill="none" stroke="var(--ember)" strokeWidth={1.5 / vp.zoom} strokeDasharray={`${5 / vp.zoom} ${5 / vp.zoom}`} opacity={0.7} />
            ))}
          </svg>
          {doc.nodes.map((n) =>
            n.kind === "frame" ? (
              <FrameView
                key={n.id}
                frame={n}
                marks={marksByFrame.get(n.id) ?? []}
                selected={selSet.has(n.id)}
                zoom={vp.zoom}
                offset={moving?.has(n.id) ? offset : undefined}
                onPointerDown={onNodeDown}
                onPreview={(f) => (f.screens?.length ? useStore.getState().playPrototype(f.id) : setPreview(f))}
                onDelete={deleteNode}
                onAsk={onAskAbout}
                activeMark={activeMark}
                setActiveMark={setActiveMark}
              />
            ) : (
              <NoteView key={n.id} note={n} selected={selSet.has(n.id)} zoom={vp.zoom} offset={moving?.has(n.id) ? offset : undefined} onPointerDown={onNodeDown} autoEdit={n.id === newNoteId} />
            ),
          )}
        </div>

        {drag?.kind === "marquee" && r && (
          <div
            className="border-pin pointer-events-none absolute border"
            style={{
              left: Math.min(drag.sx, drag.ex) - r.left,
              top: Math.min(drag.sy, drag.ey) - r.top,
              width: Math.abs(drag.ex - drag.sx),
              height: Math.abs(drag.ey - drag.sy),
              background: "color-mix(in oklch, var(--pin) 8%, transparent)",
            }}
          />
        )}
      </div>

      {pendingComment && (
        <CommentComposer
          at={pendingComment}
          onCancel={() => setPendingComment(null)}
          onSave={(text) => {
            addMarks(convId, pendingComment.frameId, [{ type: "comment", x: pendingComment.x, y: pendingComment.y, text }], "user")
            setPendingComment(null)
            setTool("select")
          }}
        />
      )}

      {!doc.nodes.length && <EmptyCanvas onUpload={() => fileInput.current?.click()} />}

      {dropping && (
        <div className="border-ember bg-ember-soft pointer-events-none absolute inset-3 flex items-center justify-center rounded-xl border-2 border-dashed">
          <div className="bg-background rounded-lg px-4 py-2 text-sm font-medium shadow">Drop screenshots to add them to the canvas</div>
        </div>
      )}

      {/* toolbar */}
      <div className="bg-card absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border p-1 shadow-md">
        <ToolButton label="Select" k="V" active={tool === "select" && !space} onClick={() => setTool("select")}>
          <MousePointer2 />
        </ToolButton>
        <ToolButton label="Hand" k="H" active={tool === "hand" || space} onClick={() => setTool("hand")}>
          <Hand />
        </ToolButton>
        <ToolButton label="Note" k="N" active={tool === "note"} onClick={() => setTool("note")}>
          <StickyNote />
        </ToolButton>
        <ToolButton label="Comment on a frame" k="C" active={tool === "comment"} onClick={() => setTool("comment")}>
          <MessageCircle />
        </ToolButton>
        <ToolButton label="Add screenshots" onClick={() => fileInput.current?.click()}>
          <ImagePlus />
        </ToolButton>
        <div className="bg-border mx-1 h-5 w-px" />
        <ToolButton label="Undo" k="⌘Z" disabled={!history?.past.length} onClick={undo}>
          <Undo2 />
        </ToolButton>
        <ToolButton label="Redo" k="⇧⌘Z" disabled={!history?.future.length} onClick={redo}>
          <Redo2 />
        </ToolButton>
      </div>

      {/* zoom */}
      <div className="bg-card absolute right-4 bottom-4 flex items-center rounded-xl border p-1 shadow-md">
        <ToolButton label="Zoom out" k="⌘−" onClick={() => zoomAt(1 / 1.2)}>
          <Minus />
        </ToolButton>
        <button className="tabular hover:bg-accent h-8 w-12 rounded-md text-[12px] font-medium" onClick={() => setVp((v) => ({ ...v, zoom: 1 }))} title="Reset to 100%">
          {Math.round(vp.zoom * 100)}%
        </button>
        <ToolButton label="Zoom in" k="⌘+" onClick={() => zoomAt(1.2)}>
          <Plus />
        </ToolButton>
        <ToolButton label="Zoom to fit" k="⌘0" onClick={() => fitTo(doc.nodes)}>
          <Maximize />
        </ToolButton>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ""
          if (files.length) addImageFiles(convId, files)
        }}
      />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-[min(1400px,95vw)] overflow-hidden p-0 sm:max-w-[min(1400px,95vw)]">
          <DialogHeader className="border-b px-5 py-3">
            <DialogTitle className="text-base">
              {preview?.title} {preview?.version ? `· V${preview.version}` : ""}
            </DialogTitle>
            {preview?.changeSummary && <DialogDescription>{preview.changeSummary}</DialogDescription>}
          </DialogHeader>
          <div className="bg-canvas flex max-h-[78vh] justify-center overflow-auto p-6" data-scrollable>
            {preview?.type === "wireframe" ? (
              <iframe title="preview" srcDoc={buildSrcDoc(preview.html ?? "", wireframeVars(allDesignSystems(useStore.getState().designSystems).find((d) => d.id === preview.designSystemId)))} sandbox="allow-same-origin" className="rounded-2xl border bg-white shadow" style={{ width: preview.w, height: preview.h, maxWidth: "100%" }} />
            ) : preview?.src ? (
              <img src={preview.src} alt={preview.title} className="max-w-full rounded border shadow" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ToolButton({ label, k, active, disabled, onClick, children }: { label: string; k?: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={active ? "default" : "ghost"} size="icon" className="size-8 [&_svg]:size-4" disabled={disabled} onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex items-center gap-2">
        {label}
        {k && <Kbd>{k}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

function CommentComposer({ at, onSave, onCancel }: { at: { sx: number; sy: number }; onSave: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("")
  return (
    <div className="bg-popover absolute z-20 w-64 rounded-xl border p-2 shadow-lg" style={{ left: at.sx + 10, top: at.sy - 10 }} onPointerDown={(e) => e.stopPropagation()}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === "Enter" && !e.shiftKey && text.trim()) {
            e.preventDefault()
            onSave(text.trim())
          }
          if (e.key === "Escape") onCancel()
        }}
        placeholder="Add a comment"
        className="min-h-16 w-full resize-none bg-transparent p-1 text-[13px] outline-none"
      />
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={!text.trim()} onClick={() => onSave(text.trim())}>
          Comment
        </Button>
      </div>
    </div>
  )
}

function EmptyCanvas({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="bg-card pointer-events-auto max-w-sm rounded-2xl border p-6 text-center shadow-md">
        <h3 className="text-lg font-semibold">Start with your work</h3>
        <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
          Drop or paste screenshots here, load a Figma link from the chat, or ask the agent to wireframe something. Select frames to discuss them.
        </p>
        <Button className="mt-4" variant="outline" size="sm" onClick={onUpload}>
          <Upload /> Add screenshots
        </Button>
      </div>
    </div>
  )
}
