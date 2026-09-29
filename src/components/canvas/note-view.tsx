import { memo, useEffect, useMemo, useState } from "react"
import { ArrowRight, FileText, Sparkles } from "@/components/ui/icons"
import type { NoteNode } from "@/lib/types"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { noteSnippet, parseSections } from "@/lib/notes"

interface Props {
  note: NoteNode
  selected: boolean
  zoom: number
  offset?: { dx: number; dy: number }
  onPointerDown: (e: React.PointerEvent, id: string) => void
  autoEdit?: boolean
}

export const NoteView = memo(function NoteView(props: Props) {
  return props.note.author === "agent" ? <NoteCard {...props} /> : <StickyNote {...props} />
})

/** The agent's notes: a compact card; the full document opens in the notes reader. */
function NoteCard({ note: n, selected, zoom, offset, onPointerDown }: Props) {
  const openNotes = useStore((s) => s.openNotes)
  const inv = 1 / zoom
  const sections = useMemo(() => parseSections(n.text), [n.text])
  const snippet = useMemo(() => noteSnippet(n.text), [n.text])
  return (
    <div
      data-node={n.id}
      className="bg-card absolute flex flex-col overflow-hidden rounded-xl border"
      style={{
        left: n.x + (offset?.dx ?? 0),
        top: n.y + (offset?.dy ?? 0),
        width: Math.max(n.w, 260),
        // Older agent notes were sized to their text; every card is the same compact height now.
        height: 156,
        boxShadow: selected ? `0 0 0 ${2 * inv}px var(--pin), var(--elev-md)` : "var(--elev-sm)",
      }}
      onPointerDown={(e) => onPointerDown(e, n.id)}
      onDoubleClick={() => openNotes(n.id)}
    >
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <span className="bg-ember-soft text-ember grid size-6 shrink-0 place-items-center rounded-md">
          <FileText className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{n.title || "Design notes"}</div>
        <Sparkles className="text-muted-foreground size-3 shrink-0" aria-label="Written by the agent" />
      </div>
      <p className="text-muted-foreground line-clamp-3 flex-1 px-3.5 pt-1.5 text-[12.5px] leading-snug">{snippet || "Empty note"}</p>
      <div className="flex items-center gap-2 px-3.5 pb-3">
        <span className="text-muted-foreground text-[11.5px] tabular-nums">
          {sections.length} section{sections.length === 1 ? "" : "s"}
        </span>
        <div className="flex-1" />
        <button
          className="hover:bg-accent inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => openNotes(n.id)}
        >
          Open <ArrowRight className="size-3" />
        </button>
      </div>
    </div>
  )
}

/** The designer's own quick notes stay as editable stickies. */
function StickyNote({ note: n, selected, zoom, offset, onPointerDown, autoEdit }: Props) {
  const [editing, setEditing] = useState(!!autoEdit)
  const [draft, setDraft] = useState(n.text)
  // The canvas marks a note as new right after adding it, so start editing when that arrives too.
  useEffect(() => {
    if (autoEdit) setEditing(true)
  }, [autoEdit])
  const edit = useStore((s) => s.editCanvas)
  const inv = 1 / zoom
  const save = () => {
    setEditing(false)
    if (draft !== n.text) edit((d) => ({ ...d, nodes: d.nodes.map((x) => (x.id === n.id ? { ...x, text: draft } : x)) }))
  }
  return (
    <div
      data-node={n.id}
      className={cn("bg-note text-note-foreground absolute flex flex-col gap-2 rounded-lg p-4")}
      style={{
        left: n.x + (offset?.dx ?? 0),
        top: n.y + (offset?.dy ?? 0),
        width: n.w,
        minHeight: n.h,
        boxShadow: selected
          ? `0 0 0 ${2 * inv}px var(--pin), var(--elev-md)`
          : "var(--elev-sm)",
      }}
      onPointerDown={(e) => !editing && onPointerDown(e, n.id)}
      onDoubleClick={() => {
        setDraft(n.text)
        setEditing(true)
      }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase opacity-70">
        {n.author === "agent" && <Sparkles className="size-3" />}
        {n.title ?? (n.author === "agent" ? "Agent note" : "Note")}
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) save()
            e.stopPropagation()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Write a note…"
          className="min-h-24 w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-current placeholder:opacity-50"
        />
      ) : (
        <div className="text-[14px] leading-relaxed whitespace-pre-wrap">{n.text || <span className="opacity-50">Double-click to write</span>}</div>
      )}
    </div>
  )
}
