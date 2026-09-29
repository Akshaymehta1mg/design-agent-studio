import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Check, Copy, Download, FileText, Pencil } from "@/components/ui/icons"
import { useStore } from "@/lib/store"
import { parseSections } from "@/lib/notes"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/chat/markdown"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

/** The agent's notes document: contents on the left, the full text in the centre. */
export function NotesReader() {
  const reading = useStore((s) => s.reading)
  const openNotes = useStore((s) => s.openNotes)
  const edit = useStore((s) => s.editCanvas)
  const note = useStore((s) => {
    if (!reading) return undefined
    const n = s.conversations.find((c) => c.id === s.activeId)?.canvas.nodes.find((x) => x.id === reading)
    return n?.kind === "note" ? n : undefined
  })
  const sections = useMemo(() => (note ? parseSections(note.text) : []), [note])
  const [active, setActive] = useState<string | undefined>()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [article, setArticle] = useState<HTMLDivElement | null>(null)
  const jumping = useRef(false)

  useEffect(() => {
    setEditing(false)
    setActive(undefined)
  }, [reading])

  // Highlight the section being read.
  useEffect(() => {
    if (!article || editing) return
    const els = sections.map((s) => article.querySelector<HTMLElement>(`#${CSS.escape(s.id)}`)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    setActive((a) => a ?? els[0].id)
    const io = new IntersectionObserver(
      (entries) => {
        if (jumping.current) return
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id)
      },
      { root: article, rootMargin: "0px 0px -65% 0px" },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [article, sections, editing])

  const jump = (id: string) => {
    const el = article?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    if (!el || !article) return
    setActive(id)
    jumping.current = true
    article.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" })
    setTimeout(() => (jumping.current = false), 600)
  }

  const title = note?.title || "Design notes"
  const save = () => {
    if (note && draft !== note.text) edit((d) => ({ ...d, nodes: d.nodes.map((x) => (x.id === note.id ? { ...x, text: draft } : x)) }))
    setEditing(false)
  }
  const download = () => {
    if (!note) return
    const url = URL.createObjectURL(new Blob([`# ${title}\n\n${note.text}`], { type: "text/markdown" }))
    const a = Object.assign(document.createElement("a"), { href: url, download: `${title.replace(/[^\w -]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "notes"}.md` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <Dialog open={!!note} onOpenChange={(o) => !o && openNotes(null)}>
      <DialogContent showCloseButton className="flex h-[88vh] max-w-[min(1100px,96vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,96vw)]">
        {note && (
          <>
            <header className="flex h-13 shrink-0 items-center gap-2 border-b py-2 pr-12 pl-4">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-[14px]">{title}</DialogTitle>
                <DialogDescription className="text-[12px]">
                  {note.author === "agent" ? "Written by the agent" : "Your note"} · {sections.length} section{sections.length === 1 ? "" : "s"}
                </DialogDescription>
              </div>
              {editing ? (
                <>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-8" onClick={save}>
                    <Check /> Save
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      navigator.clipboard?.writeText(note.text).then(() => toast.success("Notes copied"), () => {})
                    }}
                  >
                    <Copy /> Copy
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={download}>
                    <Download /> .md
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setDraft(note.text)
                      setEditing(true)
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                </>
              )}
            </header>
            <div className="flex min-h-0 flex-1">
              <nav className="bg-sidebar hidden w-[240px] shrink-0 flex-col gap-px overflow-y-auto border-r p-2 md:flex" aria-label="Contents" data-scrollable>
                <div className="text-muted-foreground px-2 pt-1 pb-1.5 text-[11px] font-medium">Contents</div>
                {sections.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => jump(s.id)}
                    disabled={editing}
                    aria-current={active === s.id ? "true" : undefined}
                    className={cn(
                      "flex min-h-8 items-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug transition-colors disabled:opacity-50",
                      s.level >= 3 && "pl-6",
                      active === s.id ? "bg-sidebar-accent font-medium" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                    )}
                  >
                    {s.level < 3 && <span className="text-muted-foreground w-4 shrink-0 text-right text-[11px] tabular-nums">{i + 1}</span>}
                    <span className="min-w-0 flex-1">{s.title}</span>
                  </button>
                ))}
              </nav>
              {editing ? (
                <div className="flex min-h-0 flex-1 flex-col p-4">
                  <Textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save()
                    }}
                    className="min-h-0 flex-1 resize-none font-mono text-[13px] leading-relaxed"
                    aria-label="Notes (Markdown)"
                  />
                  <p className="text-muted-foreground mt-2 text-[12px]">Markdown. Use ## headings to add sections to the contents.</p>
                </div>
              ) : (
                <div ref={setArticle} className="relative min-h-0 flex-1 overflow-y-auto" data-scrollable>
                  <article className="mx-auto flex max-w-[720px] flex-col gap-8 px-8 py-8">
                    {sections.map((s) => (
                      <section key={s.id} id={s.id} className="flex scroll-mt-6 flex-col gap-2">
                        <h2 className={cn("font-semibold tracking-[-0.01em]", s.level >= 3 ? "text-[15px]" : "text-[19px]")}>{s.title}</h2>
                        {s.body && <Markdown text={s.body} className="text-[14.5px] leading-[1.7]" />}
                      </section>
                    ))}
                  </article>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
