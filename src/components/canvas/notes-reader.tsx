import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Bold, Check, Copy, Download, FilePdf, FileText, Heading2, Heading3, Italic, ListBullets, ListNumbers, Pencil, Pilcrow } from "@/components/ui/icons"
import { useStore } from "@/lib/store"
import { htmlToMarkdown, parseSections, type NoteSection } from "@/lib/notes"
import { cn } from "@/lib/utils"
import { Markdown, toHtml } from "@/components/chat/markdown"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** The notes as formatted HTML: a heading per section, then its body. */
const notesHtml = (sections: NoteSection[]) => sections.map((s) => `<h${s.level >= 3 ? 3 : 2}>${escapeHtml(s.title)}</h${s.level >= 3 ? 3 : 2}>${s.body ? toHtml(s.body) : "<p><br></p>"}`).join("")

/** Print the notes to PDF through the browser's print dialog (Save as PDF), as a clean document. */
function printNotes(title: string, sections: NoteSection[]) {
  const frame = document.createElement("iframe")
  frame.setAttribute("aria-hidden", "true")
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" })
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { margin: 18mm 16mm; }
    body { font: 11pt/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; }
    h1 { font-size: 20pt; margin: 0 0 4pt; } .meta { color: #666; font-size: 9pt; margin-bottom: 18pt; }
    h2 { font-size: 14pt; margin: 18pt 0 6pt; break-after: avoid; } h3, h4 { font-size: 12pt; margin: 12pt 0 4pt; break-after: avoid; }
    p, li { margin: 0 0 6pt; } ul, ol { padding-left: 18pt; margin: 0 0 8pt; }
    table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 10pt; } th, td { border: 1px solid #ccc; padding: 4pt 6pt; text-align: left; vertical-align: top; }
    code { font-family: ui-monospace, Menlo, monospace; font-size: 9.5pt; } img { max-width: 100%; } a { color: inherit; }
  </style></head><body><h1>${escapeHtml(title)}</h1><div class="meta">Design Agent Studio · ${new Date().toLocaleDateString()}</div>${notesHtml(sections)}</body></html>`)
  doc.close()
  const go = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 1000)
  }
  // Give images a moment to load before printing.
  setTimeout(go, 250)
}

const TOOLS = [
  { label: "Heading", icon: Heading2, run: () => document.execCommand("formatBlock", false, "h2") },
  { label: "Subheading", icon: Heading3, run: () => document.execCommand("formatBlock", false, "h3") },
  { label: "Text", icon: Pilcrow, run: () => document.execCommand("formatBlock", false, "p") },
  { label: "Bold", icon: Bold, run: () => document.execCommand("bold") },
  { label: "Italic", icon: Italic, run: () => document.execCommand("italic") },
  { label: "Bulleted list", icon: ListBullets, run: () => document.execCommand("insertUnorderedList") },
  { label: "Numbered list", icon: ListNumbers, run: () => document.execCommand("insertOrderedList") },
] as const

/** Edit the notes like a normal document; they're saved back as Markdown behind the scenes. */
function NotesEditor({ sections, editorRef }: { sections: NoteSection[]; editorRef: React.RefObject<HTMLDivElement | null> }) {
  const initial = useMemo(() => notesHtml(sections), [sections])
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = initial
    el.focus()
  }, [initial, editorRef])
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-0.5 border-b px-4 py-1.5" role="toolbar" aria-label="Formatting">
        {TOOLS.map((t, i) => (
          <button
            key={t.label}
            title={t.label}
            aria-label={t.label}
            // Keep the text selection while clicking the toolbar.
            onMouseDown={(e) => {
              e.preventDefault()
              t.run()
            }}
            className={cn("hover:bg-accent text-muted-foreground hover:text-foreground grid size-8 place-items-center rounded-md", (i === 3 || i === 5) && "ml-2")}
          >
            <t.icon className="size-4" />
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" data-scrollable>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Notes"
          onPaste={(e) => {
            // Paste as plain text so outside formatting doesn't leak in.
            e.preventDefault()
            document.execCommand("insertText", false, e.clipboardData.getData("text/plain"))
          }}
          className="md mx-auto min-h-full max-w-[720px] px-8 py-8 text-[14.5px] leading-[1.7] outline-none [&_h2]:mt-7 [&_h2]:mb-1 [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2:first-child]:mt-0 [&_h3]:mt-5 [&_h3]:text-[15px] [&_h3]:font-semibold"
        />
      </div>
    </div>
  )
}

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
  const editorRef = useRef<HTMLDivElement>(null)
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
    const text = editorRef.current ? htmlToMarkdown(editorRef.current) : note?.text
    if (note && text != null && text !== note.text) edit((d) => ({ ...d, nodes: d.nodes.map((x) => (x.id === note.id ? { ...x, text } : x)) }))
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8">
                        <Download /> Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => printNotes(title, sections)}>
                        <FilePdf /> PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={download}>
                        <FileText /> Markdown (.md)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setEditing(true)}>
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
                <NotesEditor sections={sections} editorRef={editorRef} />
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
