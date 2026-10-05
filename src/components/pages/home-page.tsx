import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowUp, ChevronDown, Cpu, FileText, Shapes as Figma, ImagePlus, LayoutGrid, List, Mic, Palette, Paperclip, Plus, RefreshCw, ArrowRight, Search, Settings2, X } from "@/components/ui/icons"
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
import { ProjectMenu, ProjectMosaic, StarButton, StarGlyph, projectKind, projectMeta, timeAgo } from "@/components/project-card"
import { FigmaLogo, TypeTile } from "@/components/type-icon"
import { RenameDialog } from "@/components/rename-dialog"
import { emitCreate } from "@/components/shell/dashboard-sidebar"

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

export function HomePage() {
  const name = useStore((s) => s.settings.profileName?.trim())
  const [kind, setKind] = useState<OutputKind | null>(null)
  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto flex max-w-[1180px] flex-col px-6 md:px-10">
        <section className="relative flex flex-col items-center pt-[max(48px,10vh)] pb-12">
          <motion.div aria-hidden className="prism-glow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease: EASE_OUT }} />
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }} className="text-muted-foreground relative mb-3 text-[14.5px] font-medium">
            {greeting()}
            {name ? `, ${name}` : ""}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.03 }}
            className="relative text-center text-[34px] leading-[1.1] font-extrabold tracking-[-0.035em] text-balance md:text-[44px]"
          >
            What are we designing today?
          </motion.h1>
          <div className="relative w-full max-w-[720px]">
            <HomeComposer kind={kind} setKind={setKind} />
          </div>
        </section>
        <Starters kind={kind} />
      </div>
      <RecentsSheet />
    </div>
  )
}

// ───────────────────────── output types ─────────────────────────

export type OutputKind = "critique" | "wireframe" | "flow" | "live"

const KINDS: {
  id: OutputKind | "figma"
  label: string
  placeholder?: string
}[] = [
  {
    id: "critique",
    label: "Critique",
    placeholder: "Drop a screenshot, then ask what to look at…",
  },
  {
    id: "wireframe",
    label: "Wireframe",
    placeholder: "Describe the screen you want to sketch…",
  },
  { id: "flow", label: "Flow", placeholder: "Which journey should Prism map?" },
  { id: "live", label: "Live crit" },
  { id: "figma", label: "From Figma" },
]

/** What a chosen type adds in front of the prompt, unless the prompt already says it. */
const KIND_PREFIX: Partial<Record<OutputKind, string>> = {
  critique: "Critique this: ",
  wireframe: "Wireframe this: ",
  flow: "Map this as a user flow: ",
}
const SAYS_IT = /^(critique|review|audit|compare|wireframe|sketch|design|map|draw)\b/i

function HomeComposer({ kind, setKind }: { kind: OutputKind | null; setKind: (k: OutputKind | null) => void }) {
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
  const [figma, setFigma] = useState<{
    url: string
    allowComments: boolean
  } | null>(null)
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
          setFiles((x) => [
            ...x,
            {
              kind: "file",
              name: f.name,
              mime: f.type || "text/plain",
              size: f.size,
              text: t,
            },
          ])
        } else if (f.type === "application/pdf") {
          const d = await readAsDataUrl(f)
          setFiles((x) => [
            ...x,
            {
              kind: "file",
              name: f.name,
              mime: f.type,
              size: f.size,
              dataUrl: d,
            },
          ])
        } else toast.error(`Can't read ${f.name}. Upload text, Markdown, CSV, JSON, PDF or images.`)
      } catch {
        toast.error(`Couldn't read ${f.name}.`)
      }
    }
  }

  const submit = async (override?: string) => {
    let body = (override ?? text).trim()
    if (!body && !images.length && !figma) return
    if (dictation.listening) dictation.stop()
    if (kind === "critique" && !body) body = "Critique this screen. What would you change first?"
    const prefix = kind ? KIND_PREFIX[kind] : undefined
    if (prefix && body && !SAYS_IT.test(body)) body = prefix + body
    setBusy(true)
    await startProject({
      text: body,
      images: images.map((i) => i.file),
      files,
      figma: figma ?? undefined,
      designSystemId: dsId,
    })
    setBusy(false)
  }

  // Starter cards fill the composer instead of sending, so the prompt can be edited first.
  useEffect(() => {
    const onSeed = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; kind: OutputKind }>).detail
      if (d.kind === "live")
        return startProject({
          text: d.text,
          mode: "live",
          designSystemId: dsId,
        })
      setKind(d.kind)
      setText(d.text)
      requestAnimationFrame(() => {
        ta.current?.focus()
        ta.current?.setSelectionRange(d.text.length, d.text.length)
        ta.current?.scrollIntoView({ block: "center", behavior: "smooth" })
      })
    }
    window.addEventListener("das:home-seed", onSeed)
    return () => window.removeEventListener("das:home-seed", onSeed)
  }, [dsId, setKind])

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

  const pick = (id: (typeof KINDS)[number]["id"]) => {
    if (id === "figma") return setFigmaOpen(true)
    if (id === "live") return startProject({ text: "", mode: "live", designSystemId: dsId })
    setKind(kind === id ? null : id)
    if (id === "critique" && kind !== id && !images.length && !figma) imgInput.current?.click()
    requestAnimationFrame(() => ta.current?.focus())
  }

  const hasContent = !!text.trim() || images.length > 0 || !!figma
  const placeholder = KINDS.find((k) => k.id === kind)?.placeholder ?? "Ask Prism to critique, wireframe or map anything…"

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
                <FigmaLogo size={13} className="shrink-0" />
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
          placeholder={placeholder}
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

          <AnimatePresence initial={false}>
            {kind && (
              <motion.span
                key={kind}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="bg-primary/10 text-primary inline-flex h-8 items-center gap-1.5 rounded-full pr-1 pl-1.5 text-[12.5px] font-semibold"
              >
                <TypeTile kind={kind} size={20} />
                {KINDS.find((k) => k.id === kind)?.label}
                <button onClick={() => setKind(null)} className="hover:bg-primary/15 grid size-6 place-items-center rounded-full" aria-label="Clear type">
                  <X className="size-3" />
                </button>
              </motion.span>
            )}
          </AnimatePresence>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-muted hover:bg-accent inline-flex h-8 max-w-full items-center gap-1.5 rounded-full whitespace-nowrap pr-2.5 pl-2 text-[12.5px] font-medium transition-colors">
                <span className="flex -space-x-1">
                  {ds.colors.slice(0, 3).map((c) => (
                    <span key={c.name} className="ring-muted size-3.5 rounded-full ring-2" style={{ background: c.value }} />
                  ))}
                </span>
                <span className={cn("text-muted-foreground hidden", !kind && "md:inline")}>Design system</span>
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

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
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
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="What to make">
        {KINDS.map((k, i) => {
          const on = kind === k.id
          return (
            <motion.button
              key={k.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: EASE_OUT,
                delay: 0.12 + i * 0.04,
              }}
              onClick={() => pick(k.id)}
              aria-pressed={k.id === "live" || k.id === "figma" ? undefined : on}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border pr-4 pl-2.5 text-[13.5px] font-medium shadow-xs transition-[background,border-color,box-shadow]",
                on ? "border-primary/50 bg-primary/5 ring-primary/15 ring-3" : "bg-background hover:bg-accent",
              )}
            >
              {k.id === "figma" ? (
                <span className="grid size-5 place-items-center">
                  <FigmaLogo size={15} />
                </span>
              ) : (
                <TypeTile kind={k.id} size={20} />
              )}
              {k.label}
            </motion.button>
          )
        })}
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

// ───────────────────────── starters ─────────────────────────

const IDEAS: { kind: OutputKind; text: string }[] = [
  { kind: "critique", text: "Critique our checkout for drop-off risks" },
  { kind: "critique", text: "Review onboarding screens for clarity and tone" },
  { kind: "critique", text: "Audit a settings page for accessibility" },
  { kind: "critique", text: "Compare our pricing page with two competitors" },
  { kind: "wireframe", text: "Wireframe a mobile sign-up with social login" },
  { kind: "wireframe", text: "Three directions for an empty dashboard state" },
  {
    kind: "wireframe",
    text: "Wireframe an order tracking screen for a pharmacy app",
  },
  {
    kind: "wireframe",
    text: "Wireframe a settings page with notification controls",
  },
  { kind: "flow", text: "Map the password reset flow with its edge cases" },
  { kind: "flow", text: "Map booking a lab test at home, start to report" },
  { kind: "flow", text: "Map the refund and return flow for an online order" },
  { kind: "flow", text: "Map first-run onboarding for a brand-new user" },
  { kind: "live", text: "Live crit of the screen I'm working on" },
  { kind: "live", text: "Walk through my prototype and flag friction live" },
]

function shuffled<T>(list: T[], seed: number) {
  let s = seed >>> 0
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Starters({ kind }: { kind: OutputKind | null }) {
  const [seed, setSeed] = useState(() => (Math.random() * 1e9) | 0)
  const shown = useMemo(() => {
    const mixed = shuffled(IDEAS, seed)
    // Spread the types out when nothing is picked; lead with the picked type otherwise.
    if (kind) return [...mixed.filter((i) => i.kind === kind), ...mixed.filter((i) => i.kind !== kind)].slice(0, 6)
    const byKind = (["critique", "wireframe", "flow", "live"] as const).map((k) => mixed.filter((i) => i.kind === k))
    const out: typeof IDEAS = []
    for (let r = 0; out.length < 6; r++) for (const g of byKind) if (g[r] && out.length < 6) out.push(g[r])
    return out
  }, [kind, seed])

  return (
    <section className="pb-14">
      <div className="mb-3 flex items-center gap-2 text-[14px]">
        <span className="text-muted-foreground font-medium">Start with an idea</span>
        <span className="text-muted-foreground/50" aria-hidden>
          ·
        </span>
        <button onClick={() => setSeed((s) => s + 1)} className="hover:bg-accent -mx-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium transition-colors">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((idea, i) => (
            <motion.button
              key={idea.text}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.025 }}
              onClick={() => window.dispatchEvent(new CustomEvent("das:home-seed", { detail: idea }))}
              className="group bg-card hover:border-foreground/15 relative flex h-[136px] flex-col overflow-hidden rounded-2xl border px-4 pt-3.5 text-left shadow-xs transition-[box-shadow,border-color] hover:shadow-md"
            >
              <span className="line-clamp-2 text-[14.5px] leading-snug font-medium text-pretty">{idea.text}</span>
              <StarterArt kind={idea.kind} />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

/** Two stacked sheets peeking from the bottom of a starter card, drawn for its type. */
function StarterArt({ kind }: { kind: OutputKind }) {
  const bar = "bg-muted-foreground/15 rounded-full"
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-4 bottom-0 h-[62px]">
      <div className="bg-card absolute inset-x-3 top-0 h-full rounded-t-lg border border-b-0 transition-transform duration-300 group-hover:-translate-y-1" />
      <div className="bg-card absolute inset-x-0 top-3 h-full rounded-t-lg border border-b-0 px-2.5 pt-2 shadow-[0_-4px_14px_-6px_rgb(0_0_0/0.08)] transition-transform duration-300 group-hover:-translate-y-1.5">
        <div className="flex items-center gap-1.5">
          <TypeTile kind={kind} size={14} />
          <span className={cn(bar, "h-1.5 w-20")} />
        </div>
        {kind === "wireframe" ? (
          <div className="mt-2 grid grid-cols-[1fr_1fr_1.4fr] gap-1.5">
            <span className="h-6 rounded bg-violet-500/12" />
            <span className="h-6 rounded bg-violet-500/12" />
            <span className="h-6 rounded border border-dashed border-violet-500/40" />
          </div>
        ) : kind === "flow" ? (
          <div className="mt-2.5 flex items-center gap-1">
            {[0, 1, 2].map((n) => (
              <span key={n} className="contents">
                {n > 0 && <span className="h-px flex-1 bg-emerald-500/50" />}
                <span className="h-4 w-10 rounded-md border border-emerald-500/40 bg-emerald-500/10" />
              </span>
            ))}
          </div>
        ) : kind === "critique" ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" />
              <span className={cn(bar, "h-1.5 w-3/4")} />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500/60" />
              <span className={cn(bar, "h-1.5 w-1/2")} />
            </span>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-rose-500/12 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-rose-600">
              <span className="size-1.5 animate-pulse rounded-full bg-rose-500" /> LIVE
            </span>
            <span className={cn(bar, "h-1.5 w-1/2")} />
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── recents ─────────────────────────

type Sort = "updated" | "created" | "name"

export function ProjectCollection({ limit, showHeader = true, title = "Recents", scopes = false }: { limit?: number; showHeader?: boolean; title?: string; scopes?: boolean }) {
  const conversations = useStore((s) => s.conversations)
  const openProject = useStore((s) => s.openProject)
  const setRoute = useStore((s) => s.setRoute)
  const [scope, setScope] = useState<"recent" | "favorites">("recent")
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [sort, setSort] = useState<Sort>("updated")
  const [filter, setFilter] = useState<"all" | "wireframes" | "screens" | "flows">("all")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [renaming, setRenaming] = useState<string | null>(null)

  const list = useMemo(() => {
    let l = conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    if (scope === "favorites") l = l.filter((c) => c.starred)
    if (filter !== "all") {
      const t = filter === "wireframes" ? "wireframe" : filter === "flows" ? "workflow" : "image"
      l = l.filter((c) => c.canvas.nodes.some((n) => n.kind === "frame" && n.type === t))
    }
    l = [...l].sort((a, b) => (sort === "name" ? a.title.localeCompare(b.title) : sort === "created" ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt))
    return limit ? l.slice(0, limit) : l
  }, [conversations, query, sort, filter, limit, scope])
  const favCount = conversations.filter((c) => c.starred).length
  const showNewCard = !query && scope === "recent" && filter === "all"

  const SORT_LABEL: Record<Sort, string> = {
    updated: "Last updated",
    created: "Date created",
    name: "Name",
  }
  const FILTER_LABEL = {
    all: "All projects",
    wireframes: "With wireframes",
    screens: "With screenshots",
    flows: "With flows",
  }

  return (
    <section className="pb-16">
      {showHeader && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {scopes ? (
            <div className="mr-auto flex items-center gap-1" role="tablist" aria-label="Projects">
              {(["recent", "favorites"] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={scope === s}
                  onClick={() => setScope(s)}
                  className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors", scope === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-accent")}
                >
                  {s === "recent" ? "Recent" : "Favorites"}
                  {s === "favorites" && favCount > 0 && <span className="tabular-nums opacity-60">{favCount}</span>}
                </button>
              ))}
              {limit && conversations.length > 0 && (
                <button onClick={() => setRoute("files")} className="text-muted-foreground hover:text-foreground ml-2 inline-flex items-center gap-1 text-[13px] font-medium">
                  View all <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          ) : (
            <h2 className="mr-auto font-sans text-[17px] font-semibold tracking-normal">{title}</h2>
          )}
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

      {list.length === 0 && !showNewCard ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-14 text-center text-[13.5px]">
          {query ? (
            <>No projects match “{query}”.</>
          ) : scope === "favorites" ? (
            <>
              <StarGlyph filled={false} className="size-5" />
              <span className="text-foreground text-[14px] font-semibold">No favorites yet</span>
              Star a project to keep it here and in the sidebar.
            </>
          ) : (
            <>Nothing matches this filter.</>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {showNewCard && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              onClick={() => emitCreate("blank")}
              className="group text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/[0.03] flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors"
            >
              <span className="bg-background group-hover:bg-primary grid size-11 place-items-center rounded-full border shadow-xs transition-colors group-hover:border-transparent group-hover:text-white">
                <Plus className="size-5" />
              </span>
              <span className="text-[14px] font-semibold">New project</span>
              <span className="-mt-2 max-w-[220px] text-center text-[12.5px] leading-snug">{list.length ? "A blank canvas and chat" : "Each project keeps its canvas, chat and every version Prism makes"}</span>
            </motion.button>
          )}
          {list.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: EASE_OUT,
                delay: Math.min(i + 1, 8) * 0.03,
              }}
              onClick={() => openProject(c.id)}
              onKeyDown={(e) => e.key === "Enter" && openProject(c.id)}
              role="button"
              tabIndex={0}
              className="group bg-card hover:shadow-md focus-visible:ring-ring/50 cursor-pointer overflow-hidden rounded-2xl border shadow-xs transition-shadow outline-none focus-visible:ring-2"
            >
              <ProjectMosaic conv={c} />
              <div className="flex items-center gap-2.5 border-t px-3.5 py-3">
                <TypeTile kind={projectKind(c)} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{c.title}</div>
                  <div className="text-muted-foreground truncate text-[12px]">{projectMeta(c)}</div>
                </div>
                <StarButton conv={c} className={cn(!c.starred && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")} />
                <ProjectMenu conv={c} onRename={() => setRenaming(c.id)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-xs">
          <div className="text-muted-foreground grid grid-cols-[1fr_90px_120px_64px] gap-3 border-b px-4 py-2.5 text-[12px] font-medium sm:grid-cols-[1fr_90px_120px_120px_64px]">
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
              className="group hover:bg-muted/60 grid cursor-pointer grid-cols-[1fr_90px_120px_64px] items-center gap-3 border-b px-4 py-2.5 text-[13.5px] last:border-b-0 sm:grid-cols-[1fr_90px_120px_120px_64px]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <TypeTile kind={projectKind(c)} size={28} />
                <span className="truncate font-medium">{c.title}</span>
              </span>
              <span className="text-muted-foreground tabular">{c.canvas.nodes.filter((n) => n.kind === "frame").length}</span>
              <span className="text-muted-foreground">{timeAgo(c.updatedAt)}</span>
              <span className="text-muted-foreground hidden sm:block">
                {new Date(c.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="flex justify-end">
                <StarButton conv={c} className={cn(!c.starred && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")} />
                <ProjectMenu conv={c} onRename={() => setRenaming(c.id)} />
              </span>
            </div>
          ))}
        </div>
      )}
      <RenameDialog id={renaming} onClose={() => setRenaming(null)} />
    </section>
  )
}

/** Recents as a sheet that rises over the bottom of the hero. */
function RecentsSheet() {
  return (
    <div className="bg-muted/50 dark:bg-muted/30 relative mt-2 rounded-t-[32px] border-t shadow-[0_-18px_48px_-30px_rgb(15_23_42/0.25)]">
      <div className="mx-auto max-w-[1180px] px-6 pt-7 md:px-10">
        <ProjectCollection limit={8} scopes />
      </div>
    </div>
  )
}
