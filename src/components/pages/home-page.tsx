import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import {
  ArrowUp,
  ChevronDown,
  Cpu,
  FileText,
  Shapes as Figma,
  ImagePlus,
  LayoutGrid,
  List,
  Mic,
  Palette,
  Paperclip,
  Plus,
  Radio,
  Search,
  Settings2,
  Workflow as WorkflowIcon,
  X,
  MessageSquareText,
} from "@/components/ui/icons"
import { toast } from "sonner"
import type { Attachment } from "@/lib/types"
import { useStore } from "@/lib/store"
import { allDesignSystems } from "@/lib/design-systems"
import { startProject } from "@/lib/start-project"
import { formatBytes, isTextFile, readAsDataUrl, readAsText } from "@/lib/files"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"
import { useDictation } from "@/hooks/use-dictation"
import { ModelList } from "@/components/chat/model-picker"
import { FigmaDialog } from "@/components/chat/figma-popover"
import { PressButton } from "@/components/motion/button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProjectMenu, ProjectThumb, projectMeta, timeAgo } from "@/components/project-card"
import { RenameDialog } from "@/components/rename-dialog"
import { emitCreate } from "@/components/shell/dashboard-sidebar"

export function HomePage() {
  const name = useStore((s) => s.settings.profileName?.trim())
  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto flex max-w-[1180px] flex-col px-6 md:px-10">
        <section className="relative flex flex-col items-center pt-[max(56px,12vh)] pb-16">
          <motion.div aria-hidden className="prism-glow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease: EASE_OUT }} />
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="relative text-center text-[34px] leading-[1.1] font-extrabold tracking-[-0.035em] text-balance md:text-[44px]"
          >
            What can I help with{name ? `, ${name}` : ""}?
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.08 }} className="text-muted-foreground relative mt-3 max-w-[520px] text-center text-[15px] leading-relaxed text-pretty">
            Critique a screen, sketch a wireframe or map a flow. Prism works in your design system and keeps every version.
          </motion.p>
          <div className="relative w-full max-w-[720px]">
            <HomeComposer />
          </div>
        </section>
        <Recents />
      </div>
    </div>
  )
}

const QUICK = [
  { id: "critique", label: "Critique a screenshot", icon: MessageSquareText },
  { id: "figma", label: "Import from Figma", icon: Figma },
  { id: "flow", label: "Map a user flow", icon: WorkflowIcon },
  { id: "live", label: "Start a live crit", icon: Radio },
] as const

function HomeComposer() {
  const settings = useStore((s) => s.settings)
  const product = useStore((s) => s.product)
  const patchSettings = useStore((s) => s.patchSettings)
  const patchProduct = useStore((s) => s.patchProduct)
  const setRoute = useStore((s) => s.setRoute)
  const custom = useStore((s) => s.designSystems)
  const defaultDs = useStore((s) => s.defaultDesignSystemId)
  const [text, setText] = useState("")
  const [images, setImages] = useState<{ file: File; url: string }[]>([])
  const [files, setFiles] = useState<Extract<Attachment, { kind: "file" }>[]>([])
  const [figma, setFigma] = useState<{ url: string; allowComments: boolean } | null>(null)
  const [dsId, setDsId] = useState(defaultDs)
  const [figmaOpen, setFigmaOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  const imgInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const base = useRef("")
  const dictation = useDictation((f, i) => setText(`${base.current}${base.current && !base.current.endsWith(" ") ? " " : ""}${f}${i}`))
  const systems = allDesignSystems(custom)
  const ds = systems.find((d) => d.id === dsId) ?? systems[0]

  useEffect(() => setDsId(defaultDs), [defaultDs])
  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = Math.min(240, Math.max(64, el.scrollHeight)) + "px"
  }, [text])
  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.url)), [images])

  const addImages = (list: File[]) => setImages((x) => [...x, ...list.filter((f) => f.type.startsWith("image/")).map((file) => ({ file, url: URL.createObjectURL(file) }))])
  const addFiles = async (list: File[]) => {
    for (const f of list) {
      if (f.type.startsWith("image/")) {
        addImages([f])
        continue
      }
      if (f.size > 12 * 1024 * 1024) {
        toast.error(`${f.name} is over 12 MB.`)
        continue
      }
      try {
        if (isTextFile(f)) {
          const t = await readAsText(f)
          setFiles((x) => [...x, { kind: "file", name: f.name, mime: f.type || "text/plain", size: f.size, text: t }])
        } else if (f.type === "application/pdf") {
          const d = await readAsDataUrl(f)
          setFiles((x) => [...x, { kind: "file", name: f.name, mime: f.type, size: f.size, dataUrl: d }])
        } else toast.error(`Can't read ${f.name}. Upload text, Markdown, CSV, JSON, PDF or images.`)
      } catch {
        toast.error(`Couldn't read ${f.name}.`)
      }
    }
  }

  const submit = async (override?: string) => {
    const body = (override ?? text).trim()
    if (!body && !images.length && !figma) return
    if (dictation.listening) dictation.stop()
    setBusy(true)
    await startProject({ text: body, images: images.map((i) => i.file), files, figma: figma ?? undefined, designSystemId: dsId })
    setBusy(false)
  }

  // Create menu in the sidebar (and ⌘K) routes through here when Home is showing.
  useEffect(() => {
    const onCreate = (e: Event) => {
      const a = (e as CustomEvent<string>).detail
      if (a === "screenshots") imgInput.current?.click()
      if (a === "figma") setFigmaOpen(true)
    }
    window.addEventListener("das:create-home", onCreate)
    return () => window.removeEventListener("das:create-home", onCreate)
  }, [])

  const quick = (id: (typeof QUICK)[number]["id"]) => {
    if (id === "critique") {
      setText("Critique this screen. What would you change first?")
      imgInput.current?.click()
    } else if (id === "figma") setFigmaOpen(true)
    else if (id === "flow") {
      setText("Map the user flow for ")
      requestAnimationFrame(() => ta.current?.focus())
    } else startProject({ text: "", mode: "live", designSystemId: dsId })
  }

  const hasContent = !!text.trim() || images.length > 0 || !!figma

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.05 }} className="mt-8 w-full">
      <div
        className="bg-background focus-within:border-ring/60 rounded-[22px] border shadow-md transition-[border-color,box-shadow] focus-within:shadow-lg"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          addFiles([...e.dataTransfer.files])
        }}
      >
        {(images.length > 0 || files.length > 0 || figma) && (
          <div className="flex flex-wrap items-end gap-2 px-4 pt-4">
            {images.map((im, i) => (
              <div key={im.url} className="group relative size-16 overflow-hidden rounded-xl border">
                <img src={im.url} alt="" className="h-full w-full object-cover object-top" />
                <button onClick={() => setImages((x) => x.filter((_, j) => j !== i))} className="bg-background/90 absolute top-1 right-1 grid size-5 place-items-center rounded-full border opacity-0 group-hover:opacity-100" aria-label="Remove image">
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {files.map((f, i) => (
              <span key={i} className="bg-muted inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-full px-3 text-[12.5px]">
                <FileText className="size-3.5 shrink-0" />
                <span className="truncate">{f.name}</span>
                <span className="text-muted-foreground tabular shrink-0">{formatBytes(f.size)}</span>
                <button className="hover:bg-background rounded-full p-0.5" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {figma && (
              <span className="bg-muted inline-flex h-8 max-w-[260px] items-center gap-1.5 rounded-full px-3 text-[12.5px]">
                <Figma className="size-3.5 shrink-0" />
                <span className="truncate">{decodeURIComponent(figma.url.split("/")[5] ?? "Figma file").replace(/-/g, " ")}</span>
                <button className="hover:bg-background rounded-full p-0.5" onClick={() => setFigma(null)} aria-label="Remove Figma link">
                  <X className="size-3" />
                </button>
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ta}
          id="home-composer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          onPaste={(e) => {
            const imgs = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"))
            if (imgs.length) {
              e.preventDefault()
              addImages(imgs)
            }
          }}
          placeholder="Ask Prism to critique, wireframe or map anything…"
          className="placeholder:text-muted-foreground block w-full resize-none bg-transparent px-5 pt-4 pb-1 text-[15.5px] leading-relaxed outline-none"
        />
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-full [&_svg]:size-5" aria-label="Add files and settings">
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 rounded-2xl p-1.5">
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => imgInput.current?.click()}>
                <ImagePlus /> Add screenshots
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => fileInput.current?.click()}>
                <Paperclip /> Upload files and context
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setFigmaOpen(true)}>
                <Figma /> Link a Figma file
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-[11.5px] font-medium">Settings</DropdownMenuLabel>
              <DropdownMenuCheckboxItem className="rounded-lg py-2" checked={product.useInConversations} onCheckedChange={(v) => patchProduct({ useInConversations: !!v })} onSelect={(e) => e.preventDefault()}>
                Use Context file
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem className="rounded-lg py-2" checked={settings.speakReplies} onCheckedChange={(v) => patchSettings({ speakReplies: !!v })} onSelect={(e) => e.preventDefault()}>
                Read replies aloud
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setRoute("settings")}>
                <Settings2 /> API keys and settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-muted hover:bg-accent inline-flex h-8 max-w-full items-center gap-1.5 rounded-full whitespace-nowrap pr-2.5 pl-2 text-[12.5px] font-medium transition-colors">
                <span className="flex -space-x-1">
                  {ds.colors.slice(0, 3).map((c) => (
                    <span key={c.name} className="ring-muted size-3.5 rounded-full ring-2" style={{ background: c.value }} />
                  ))}
                </span>
                <span className="text-muted-foreground hidden sm:inline">Design system</span>
                <span>{ds.name}</span>
                <ChevronDown className="text-muted-foreground size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1.5">
              <DropdownMenuRadioGroup value={dsId} onValueChange={setDsId}>
                {custom.length > 0 && <DropdownMenuLabel className="text-muted-foreground text-[11.5px] font-medium">Your design systems</DropdownMenuLabel>}
                {custom.map((d) => (
                  <DropdownMenuRadioItem key={d.id} value={d.id} className="rounded-lg py-2">
                    {d.name}
                  </DropdownMenuRadioItem>
                ))}
                <DropdownMenuLabel className="text-muted-foreground text-[11.5px] font-medium">Built in</DropdownMenuLabel>
                {systems
                  .filter((d) => d.builtIn)
                  .map((d) => (
                    <DropdownMenuRadioItem key={d.id} value={d.id} className="rounded-lg py-2">
                      {d.name}
                    </DropdownMenuRadioItem>
                  ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setRoute("design-systems")}>
                <Palette /> Manage design systems
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-8 max-w-[180px] items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium">
                <Cpu className="size-3.5 shrink-0" />
                <span className="truncate">{settings.selectedModel.name}</span>
                <ChevronDown className="size-3.5 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[320px] rounded-2xl p-0">
              <ModelList onPicked={() => setModelOpen(false)} />
            </PopoverContent>
          </Popover>
          {dictation.supported && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-9 rounded-full", dictation.listening ? "text-pin pulse-ring" : "text-muted-foreground")}
              onClick={() => {
                if (dictation.listening) dictation.stop()
                else {
                  base.current = text
                  if (!dictation.start()) toast.error("Microphone isn't available here.")
                }
              }}
              aria-label={dictation.listening ? "Stop dictation" : "Dictate"}
            >
              <Mic />
            </Button>
          )}
          <PressButton size="icon" className="bg-pin hover:bg-pin/90 size-9 rounded-full text-white" disabled={!hasContent || busy} onClick={() => submit()} aria-label="Start">
            <ArrowUp className="size-5" />
          </PressButton>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK.map((q, i) => (
          <motion.button
            key={q.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.12 + i * 0.04 }}
            onClick={() => quick(q.id)}
            className="bg-background hover:bg-accent inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium shadow-xs transition-colors"
          >
            <q.icon className="text-muted-foreground size-4" />
            {q.label}
          </motion.button>
        ))}
      </div>

      <input
        ref={imgInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const l = [...(e.target.files ?? [])]
          e.target.value = ""
          addImages(l)
          requestAnimationFrame(() => ta.current?.focus())
        }}
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const l = [...(e.target.files ?? [])]
          e.target.value = ""
          addFiles(l)
        }}
      />
      <FigmaDialog open={figmaOpen} onOpenChange={setFigmaOpen} onPick={(url, allowComments) => setFigma({ url, allowComments })} />
    </motion.div>
  )
}

// ───────────────────────── recents ─────────────────────────

type Sort = "updated" | "created" | "name"

export function ProjectCollection({ limit, showHeader = true, title = "Recents" }: { limit?: number; showHeader?: boolean; title?: string }) {
  const conversations = useStore((s) => s.conversations)
  const openProject = useStore((s) => s.openProject)
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [sort, setSort] = useState<Sort>("updated")
  const [filter, setFilter] = useState<"all" | "wireframes" | "screens" | "flows">("all")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [renaming, setRenaming] = useState<string | null>(null)

  const list = useMemo(() => {
    let l = conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    if (filter !== "all") {
      const t = filter === "wireframes" ? "wireframe" : filter === "flows" ? "workflow" : "image"
      l = l.filter((c) => c.canvas.nodes.some((n) => n.kind === "frame" && n.type === t))
    }
    l = [...l].sort((a, b) => (sort === "name" ? a.title.localeCompare(b.title) : sort === "created" ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt))
    return limit ? l.slice(0, limit) : l
  }, [conversations, query, sort, filter, limit])

  const SORT_LABEL: Record<Sort, string> = { updated: "Last updated", created: "Date created", name: "Name" }
  const FILTER_LABEL = { all: "All projects", wireframes: "With wireframes", screens: "With screenshots", flows: "With flows" }

  return (
    <section className="pb-16">
      {showHeader && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-sans text-[17px] font-semibold tracking-normal">{title}</h2>
          {searching ? (
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onBlur={() => !query && setSearching(false)} placeholder="Search projects" className="h-9 w-56 rounded-lg pl-8" />
            </div>
          ) : (
            <Button variant="outline" size="icon" className="size-9 rounded-lg shadow-xs" onClick={() => setSearching(true)} aria-label="Search projects">
              <Search />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 rounded-lg shadow-xs">
                {FILTER_LABEL[filter]} <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                {Object.entries(FILTER_LABEL).map(([k, v]) => (
                  <DropdownMenuRadioItem key={k} value={k}>
                    {v}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 rounded-lg shadow-xs">
                {SORT_LABEL[sort]} <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
                {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
                  <DropdownMenuRadioItem key={k} value={k}>
                    {SORT_LABEL[k]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="bg-muted flex rounded-lg p-0.5" role="group" aria-label="View">
            {(["grid", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-label={`${v} view`} aria-pressed={view === v} className={cn("grid h-8 w-9 place-items-center rounded-md", view === v ? "bg-background shadow-xs" : "text-muted-foreground")}>
                {v === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 ? (
        query ? (
          <div className="text-muted-foreground rounded-2xl border border-dashed px-6 py-14 text-center text-[13.5px]">No projects match “{query}”.</div>
        ) : (
          <div className="bg-muted/40 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
            <div className="text-[15px] font-semibold">No projects yet</div>
            <p className="text-muted-foreground max-w-sm text-[13.5px] leading-relaxed">Each project keeps its canvas, chat and every version Prism makes. Start one here, or ask from the box on Home.</p>
            <Button className="mt-1 rounded-full" onClick={() => emitCreate("blank")}>
              <Plus /> New project
            </Button>
          </div>
        )
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(i, 8) * 0.03 }}
              onClick={() => openProject(c.id)}
              onKeyDown={(e) => e.key === "Enter" && openProject(c.id)}
              role="button"
              tabIndex={0}
              className="group bg-card hover:shadow-md focus-visible:ring-ring/50 cursor-pointer overflow-hidden rounded-2xl border shadow-xs transition-shadow outline-none focus-visible:ring-2"
            >
              <ProjectThumb conv={c} />
              <div className="flex items-center gap-2 border-t px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{c.title}</div>
                  <div className="text-muted-foreground text-[12px]">
                    {projectMeta(c)}
                  </div>
                </div>
                <ProjectMenu conv={c} onRename={() => setRenaming(c.id)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-xs">
          <div className="text-muted-foreground grid grid-cols-[1fr_90px_120px_36px] gap-3 border-b px-4 py-2.5 text-[12px] font-medium sm:grid-cols-[1fr_90px_120px_120px_36px]">
            <span>Name</span>
            <span>Frames</span>
            <span>Updated</span>
            <span className="hidden sm:block">Created</span>
            <span />
          </div>
          {list.map((c) => (
            <div
              key={c.id}
              onClick={() => openProject(c.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openProject(c.id)}
              className="hover:bg-muted/60 grid cursor-pointer grid-cols-[1fr_90px_120px_36px] items-center gap-3 border-b px-4 py-2.5 text-[13.5px] last:border-b-0 sm:grid-cols-[1fr_90px_120px_120px_36px]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="bg-muted grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border">
                  {(() => {
                    const f = c.canvas.nodes.find((n) => n.kind === "frame" && n.src)
                    return f && f.kind === "frame" && f.src ? <img src={f.src} alt="" className="h-full w-full object-cover object-top" /> : <LayoutGrid className="text-muted-foreground size-4" />
                  })()}
                </span>
                <span className="truncate font-medium">{c.title}</span>
              </span>
              <span className="text-muted-foreground tabular">{c.canvas.nodes.filter((n) => n.kind === "frame").length}</span>
              <span className="text-muted-foreground">{timeAgo(c.updatedAt)}</span>
              <span className="text-muted-foreground hidden sm:block">{new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              <ProjectMenu conv={c} onRename={() => setRenaming(c.id)} />
            </div>
          ))}
        </div>
      )}
      <RenameDialog id={renaming} onClose={() => setRenaming(null)} />
    </section>
  )
}

function Recents() {
  return <ProjectCollection limit={9} />
}

