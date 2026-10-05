import { useRef, useState } from "react"
import { FileText, Loader2, Plus, RefreshCw, Trash2, Upload, MessageSquarePlus } from "@/components/ui/icons"
import { toast } from "sonner"
import type { DesignSystemSource, ProductScreen } from "@/lib/types"
import { uid, useStore } from "@/lib/store"
import { describeImage, generate, friendlyError, currentModel } from "@/lib/agent"
import { fetchDesignSystem, parseFigmaUrl } from "@/lib/figma"
import { formatBytes, imageFileToFrameData, isTextFile, readAsText } from "@/lib/files"
import { addImages } from "@/lib/canvas-actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const READ_PROMPT =
  "You're building a reference of a product's shipped UI. Describe this screen in 3–5 sentences for a design lead: what the screen is for, its layout and hierarchy, the key components (with their visual treatment: color, type weight, radius, spacing), notable patterns, and the voice of the copy. Be concrete. No preamble."

export function ContextPage() {
  const product = useStore((s) => s.product)
  const patch = useStore((s) => s.patchProduct)
  const fileInput = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState<ProductScreen | null>(null)
  const [dragging, setDragging] = useState(false)

  const readScreen = async (s: ProductScreen) => {
    patch((p) => ({ screens: p.screens.map((x) => (x.id === s.id ? { ...x, status: "reading" } : x)) }))
    try {
      const summary = await describeImage(s.src, READ_PROMPT)
      patch((p) => ({ screens: p.screens.map((x) => (x.id === s.id ? { ...x, status: "read", summary } : x)) }))
    } catch (e) {
      patch((p) => ({ screens: p.screens.map((x) => (x.id === s.id ? { ...x, status: "error", summary: friendlyError(e) } : x)) }))
    }
  }

  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"))
    if (!imgs.length) return toast.error("Add PNG or JPG exports.")
    const screens: ProductScreen[] = await Promise.all(
      imgs.map(async (f) => {
        const d = await imageFileToFrameData(f)
        return { id: uid("s_"), name: f.name.replace(/\.(png|jpe?g|webp)$/i, ""), src: d.src, status: "new" as const }
      }),
    )
    patch((p) => ({ screens: [...p.screens, ...screens] }))
    for (const s of screens) await readScreen(s)
  }

  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-6 pt-10 pb-16 md:px-10 [&>*]:max-w-[880px]">
        <header className="flex flex-wrap items-start justify-between gap-6 pt-0">
          <div className="max-w-xl">
            <h1 className="text-[30px] leading-tight font-bold">Context file</h1>
            <p className="text-muted-foreground mt-1.5 text-[14.5px] leading-relaxed">
              Everything the agent should know about your product: what it is, who it's for, the screens you've shipped and the docs behind them. When it's on, every conversation is grounded in it.
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-2">
            <Switch id="use-product" checked={product.useInConversations} onCheckedChange={(v) => patch({ useInConversations: v })} />
            <Label htmlFor="use-product" className="text-[14px] font-normal">
              Use in conversations
            </Label>
          </div>
        </header>

        <Section title="What is it, and who is it for?">
          <Textarea id="about" value={product.about} onChange={(e) => patch({ about: e.target.value })} placeholder="What the product does, and the part of it you're designing…" className="min-h-20 text-[14px]" />
          <Field id="audience" label="Who uses it" value={product.audience} onChange={(v) => patch({ audience: v })} placeholder="Who they are, what device they use, what they're trying to get done" />
          <Saved />
        </Section>

        <Section
          title={`Screens · ${product.screens.length}`}
          action={
            <Button variant="outline" className="rounded-full" onClick={() => fileInput.current?.click()}>
              <Plus /> Add screens
            </Button>
          }
        >
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              addFiles([...e.dataTransfer.files])
            }}
            className={cn("rounded-xl transition-colors", dragging && "bg-ember-soft outline-ember outline-2 outline-dashed")}
          >
            {product.screens.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {product.screens.map((s) => (
                  <button key={s.id} className="group flex flex-col gap-2 text-left" onClick={() => setOpen(s)}>
                    <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden rounded-xl border transition-shadow group-hover:shadow-md">
                      <img src={s.src} alt={s.name} className="h-full w-full object-cover object-top" />
                      <span className="bg-background/95 absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium shadow-sm">
                        {s.status === "reading" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <span className={cn("size-1.5 rounded-full", s.status === "read" ? "bg-ok" : s.status === "error" ? "bg-destructive" : "bg-muted-foreground")} />
                        )}
                        {s.status === "reading" ? "Reading" : s.status === "read" ? "Read" : s.status === "error" ? "Couldn't read" : "Not read"}
                      </span>
                    </div>
                    <span className="truncate text-[13px] font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => fileInput.current?.click()} className="hover:bg-muted/50 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors">
                <Upload className="text-muted-foreground size-5" />
                <span className="text-[14px] font-medium">Drop screens here or use Add screens</span>
                <span className="text-muted-foreground max-w-md text-[13px]">PNG or JPG exports from Figma work best. Add your key flows: onboarding, home, a form, settings.</span>
              </button>
            )}
          </div>
        </Section>

        <DocsSection />

        <Section title="A little more about the product">
          <Field id="goals" label="Goals and metrics" value={product.goals} onChange={(v) => patch({ goals: v })} placeholder="What does success look like? Conversion, retention, time to task…" multiline />
          <Field id="constraints" label="Constraints" value={product.constraints} onChange={(v) => patch({ constraints: v })} placeholder="Platforms, tech limits, legal, partner requirements…" multiline />
          <Field id="voice" label="Voice and tone" value={product.voice} onChange={(v) => patch({ voice: v })} placeholder="How the product talks: short, warm, sentence case…" />
          <Saved />
        </Section>
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
          if (files.length) addFiles(files)
        }}
      />

      <ScreenDialog screen={open ? product.screens.find((s) => s.id === open.id) ?? null : null} onClose={() => setOpen(null)} onReread={readScreen} />
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-9 items-center justify-between gap-4">
        <h2 className="font-sans text-[15.5px] font-semibold tracking-normal">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ id, label, value, onChange, placeholder, multiline }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-[12.5px]">
        {label}
      </Label>
      {multiline ? <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-h-16 text-[14px]" /> : <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="text-[14px]" />}
    </div>
  )
}

function Saved() {
  return <span className="text-muted-foreground text-[12px]">Saved automatically</span>
}

function ScreenDialog({ screen, onClose, onReread }: { screen: ProductScreen | null; onClose: () => void; onReread: (s: ProductScreen) => void }) {
  const patch = useStore((s) => s.patchProduct)
  const activeId = useStore((s) => s.activeId)
  const openProject = useStore((s) => s.openProject)
  return (
    <Dialog open={!!screen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[760px]">
        {screen && (
          <>
            <DialogHeader>
              <DialogTitle>{screen.name}</DialogTitle>
              <DialogDescription>What the agent read</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
              <img src={screen.src} alt={screen.name} className="max-h-[420px] w-full rounded-lg border object-contain object-top" />
              <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed">
                {screen.status === "reading" ? (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Reading the screen…
                  </span>
                ) : screen.summary ? (
                  <p className={cn(screen.status === "error" && "text-destructive")}>{screen.summary}</p>
                ) : (
                  <p className="text-muted-foreground">Not read yet.</p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  patch((p) => ({ screens: p.screens.filter((s) => s.id !== screen.id) }))
                  onClose()
                }}
              >
                <Trash2 /> Remove
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onReread(screen)} disabled={screen.status === "reading"}>
                  <RefreshCw /> Read again
                </Button>
                <Button
                  onClick={async () => {
                    const s = useStore.getState()
                    const id = s.conversations.some((c) => c.id === activeId) ? activeId : s.newConversation()
                    await addImages(id, [{ src: screen.src, w: 1170, h: 2532, title: screen.name }], "product")
                    openProject(id)
                    onClose()
                    window.dispatchEvent(new CustomEvent("das:compose", { detail: { text: `What would you change on ${screen.name}?` } }))
                  }}
                >
                  <MessageSquarePlus /> Ask about this screen
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}


// ───────────────────────── brief and documents ─────────────────────────

function DocsSection() {
  const product = useStore((s) => s.product)
  const patch = useStore((s) => s.patchProduct)
  const input = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const docs = product.docs ?? []
  const add = async (files: File[]) => {
    for (const f of files) {
      if (!isTextFile(f)) {
        toast.error(`${f.name}: add text, Markdown, CSV or JSON. Paste PDF text into the brief.`)
        continue
      }
      const text = await readAsText(f)
      patch((p) => ({ docs: [...(p.docs ?? []), { id: uid("doc_"), name: f.name, text, size: f.size, addedAt: Date.now() }] }))
    }
  }
  const doc = docs.find((d) => d.id === viewing)
  return (
    <>
      <Section title="Brief">
        <Textarea
          id="brief"
          value={product.brief ?? ""}
          onChange={(e) => patch({ brief: e.target.value })}
          placeholder={"Paste PRD notes, research findings, design principles or anything else the agent should keep in mind.\n\nMarkdown is fine."}
          className="min-h-44 font-mono text-[13px] leading-relaxed"
        />
        <span className="text-muted-foreground text-[12px]">{(product.brief ?? "").length.toLocaleString()} characters · saved automatically</span>
      </Section>
      <Section
        title={`Documents · ${docs.length}`}
        action={
          <Button variant="outline" className="rounded-full" onClick={() => input.current?.click()}>
            <Plus /> Add documents
          </Button>
        }
      >
        {docs.length ? (
          <div className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <span className="bg-muted grid size-9 shrink-0 place-items-center rounded-lg border">
                  <FileText className="text-muted-foreground size-4" />
                </span>
                <button onClick={() => setViewing(d.id)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[13.5px] font-medium hover:underline">{d.name}</div>
                  <div className="text-muted-foreground text-[12px]">
                    {formatBytes(d.size)} · added {new Date(d.addedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive size-8" onClick={() => patch((p) => ({ docs: (p.docs ?? []).filter((x) => x.id !== d.id) }))} aria-label={`Remove ${d.name}`}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <button onClick={() => input.current?.click()} className="hover:bg-muted/50 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center transition-colors">
            <FileText className="text-muted-foreground size-5" />
            <span className="text-[14px] font-medium">Add PRDs, research notes or guidelines</span>
            <span className="text-muted-foreground text-[13px]">Markdown, text, CSV or JSON. The agent reads them in every conversation.</span>
          </button>
        )}
        <input
          ref={input}
          type="file"
          multiple
          accept=".md,.mdx,.txt,.csv,.json,.yaml,.yml,text/*"
          hidden
          onChange={(e) => {
            const l = [...(e.target.files ?? [])]
            e.target.value = ""
            add(l)
          }}
        />
      </Section>
      <Dialog open={!!doc} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{doc?.name}</DialogTitle>
            <DialogDescription>{doc ? formatBytes(doc.size) : ""}</DialogDescription>
          </DialogHeader>
          <pre className="bg-muted max-h-[60vh] overflow-auto rounded-xl p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap" data-scrollable>
            {doc?.text}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  )
}
