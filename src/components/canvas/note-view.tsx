import { memo, useState } from "react"
import { Sparkles } from "lucide-react"
import type { NoteNode } from "@/lib/types"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface Props {
  note: NoteNode
  selected: boolean
  zoom: number
  offset?: { dx: number; dy: number }
  onPointerDown: (e: React.PointerEvent, id: string) => void
  autoEdit?: boolean
}

export const NoteView = memo(function NoteView({ note: n, selected, zoom, offset, onPointerDown, autoEdit }: Props) {
  const [editing, setEditing] = useState(!!autoEdit)
  const [draft, setDraft] = useState(n.text)
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
})
