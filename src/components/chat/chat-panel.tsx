import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
  Check,
  ChevronDown,
  Copy,
  Cpu,
  FileText,
  Shapes as Figma,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Package,
  RotateCcw,
  Settings2,
  Square,
  Volume2,
  X,
  Sparkles,
  MessageSquareText,
  StickyNote,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import type { ActionLog, Attachment, ChatMessage, FrameNode } from "@/lib/types"
import { frameLabel, uid, useActiveConversation, useStore } from "@/lib/store"
import { runChat, speak, stopAgent } from "@/lib/agent"
import { addImageFiles } from "@/lib/canvas-actions"
import { formatBytes, isTextFile, readAsDataUrl, readAsText } from "@/lib/files"
import { cn } from "@/lib/utils"
import { hasFigmaAccess } from "@/lib/figma"
import { Markdown } from "./markdown"
import { ModelList } from "./model-picker"
import { FigmaDialog } from "./figma-popover"
import { useDictation } from "@/hooks/use-dictation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PressButton } from "@/components/motion/button"
import { ActionSwapRollIcon } from "@/components/motion/action-swap"
import { AnimatePresence, motion } from "motion/react"
import { EASE_OUT } from "@/lib/ease"
import type { MessagePart } from "@/lib/types"
import { TodoList } from "@/components/agents/todo-list"
import { ApprovalCard, type ApprovalCardAnswers } from "@/components/agents/approval-card"
import { WorkflowCard } from "@/components/agents/workflow-graph"
import { answerAsk, isWaiting } from "@/lib/message-parts"

function formatAnswers(part: Extract<MessagePart, { type: "ask" }>, answers: ApprovalCardAnswers) {
  return (part.questions ?? [])
    .map((q) => {
      const a = answers[q.id]
      if (!a) return null
      const labels = a.selected.map((v) => q.options?.find((o) => o.value === v)?.label ?? v)
      if (a.custom?.trim()) labels.push(a.custom.trim())
      return part.questions!.length > 1 ? `${q.title}: ${labels.join(", ")}` : labels.join(", ")
    })
    .filter(Boolean)
    .join(" · ")
}

function PartView({ part, loc }: { part: MessagePart; loc: { convId: string; msgId: string } }) {
  const focusNode = useStore((s) => s.focusNode)
  if (part.type === "text") return <Markdown text={part.text} className="text-[14.5px] leading-[1.65]" />
  if (part.type === "plan") return <TodoList title={part.title} items={part.items} />
  if (part.type === "workflow") return <WorkflowCard workflow={part.workflow} onOpen={() => focusNode(part.frameId)} />
  // ask
  const live = isWaiting(part.id)
  const status = part.status === "pending" && !live ? "rejected" : part.status
  const done = (s: typeof part.status, result: string) => answerAsk(loc, part.id, s, result)
  return (
    <ApprovalCard
      title={part.title}
      description={part.description}
      questions={part.questions?.map((q) => ({ ...q, autoAdvance: true }))}
      status={status}
      result={part.status === "pending" && !live ? "No longer waiting for an answer." : part.result}
      approveLabel={part.approveLabel ?? "Approve"}
      onSubmit={(answers) => done("answered", formatAnswers(part, answers) || "Answered")}
      onApprove={() => done("approved", "Approved")}
      onRequestChanges={() => done("changes-requested", "Changes requested")}
      onReject={() => done("rejected", "Rejected")}
    />
  )
}

const SUGGESTIONS = [
  "Critique the selected screens",
  "Wireframe the first step of this flow",
  "Map the booking flow as a workflow",
  "Iterate on the latest wireframe",
]

export function ChatPanel() {
  const conv = useActiveConversation()
  const busy = useStore((s) => s.busy)
  const model = useStore((s) => s.settings.selectedModel.name)
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const [atBottom, setAtBottom] = useState(true)

  const last = conv.messages[conv.messages.length - 1]
  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [conv.messages.length, last?.text, last?.parts?.length, last?.actions?.length, last?.activity, conv.id])

  const toBottom = () => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }

  return (
    <div className="bg-background relative flex h-full min-w-0 flex-col">
      <header className="flex h-14 shrink-0 items-center border-b px-4">
        <div className="min-w-0 flex-1 text-[13.5px] font-semibold">Chat</div>
        <span className="text-muted-foreground max-w-[60%] truncate text-[12px]">{model}</span>
      </header>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto"
        data-scrollable
        onScroll={(e) => {
          const el = e.currentTarget
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
          stick.current = near
          setAtBottom(near)
        }}
      >
        {conv.messages.length === 0 ? (
          <EmptyChat />
        ) : (
          <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pt-5 pb-44">
            {conv.example && <div className="text-muted-foreground text-center text-[12px]">Example conversation. Start a new one from the sidebar, or keep going here.</div>}
            {conv.messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
                {m.role === "user" ? <UserMessage m={m} /> : <AssistantMessage m={m} convId={conv.id} />}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* floating composer, like a chat app: content scrolls underneath */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="from-background via-background/90 h-10 bg-gradient-to-t to-transparent" />
        <div className="bg-background pointer-events-auto relative">
          <AnimatePresence>
            {!atBottom && conv.messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                onClick={toBottom}
                aria-label="Scroll to latest"
                className="bg-background hover:bg-accent absolute -top-11 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full border shadow-md"
              >
                <ArrowDown className="size-4" />
              </motion.button>
            )}
          </AnimatePresence>
          <Composer busy={busy} />
        </div>
      </div>
    </div>
  )
}

function EmptyChat() {
  return (
    <div className="flex h-full flex-col justify-end gap-4 px-5 pb-44">
      <div>
        <h2 className="text-[22px] font-semibold">What are we looking at?</h2>
        <p className="text-muted-foreground mt-1 text-[13.5px] leading-relaxed">
          Select frames on the canvas and ask about them, link a Figma file, or ask for a wireframe. Iterations always land beside the original as a new version.
        </p>
      </div>
      <div className="flex flex-col items-start gap-1.5">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.05 * i }}
            key={s}
            className="hover:bg-accent rounded-full border px-3.5 py-1.5 text-left text-[13px] transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent("das:compose", { detail: { text: s } }))}
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function Thumb({ a }: { a: Attachment }) {
  const conv = useActiveConversation()
  if (a.kind === "frame") {
    const f = conv.canvas.nodes.find((n) => n.id === a.frameId) as FrameNode | undefined
    return (
      <button className="bg-muted relative h-16 w-12 shrink-0 overflow-hidden rounded-xl border" title={a.title} onClick={() => f && useStore.getState().focusNode(f.id)}>
        {f?.src ? <img src={f.src} alt="" className="h-full w-full object-cover object-top" /> : <LayoutGrid className="text-muted-foreground absolute inset-0 m-auto size-4" />}
        {f?.version && <span className="bg-ember absolute right-0.5 bottom-0.5 rounded px-1 text-[9px] font-bold text-white">V{f.version}</span>}
      </button>
    )
  }
  const icon = a.kind === "figma" ? <Figma className="size-3" /> : a.kind === "product" ? <Package className="size-3" /> : <FileText className="size-3" />
  const label = a.kind === "file" ? a.name : a.title
  return (
    <span className="text-muted-foreground inline-flex h-6 max-w-[180px] items-center gap-1 rounded-full border px-2 text-[11px]">
      {icon}
      <span className="truncate">{label}</span>
    </span>
  )
}

const COLLAPSED_H = 168

function UserMessage({ m }: { m: ChatMessage }) {
  const atts = m.attachments ?? []
  const body = useRef<HTMLDivElement>(null)
  const [long, setLong] = useState(false)
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => {
    if (body.current) setLong(body.current.scrollHeight > COLLAPSED_H + 24)
  }, [m.text])
  return (
    <div className="flex flex-col items-end gap-1.5">
      {atts.length > 0 && (
        <div className="flex max-w-[90%] flex-wrap justify-end gap-1.5">
          {atts.map((a, i) => (
            <Thumb key={i} a={a} />
          ))}
        </div>
      )}
      <div className="bg-bubble text-bubble-foreground max-w-[85%] rounded-[20px] px-4 py-2.5">
        <motion.div
          initial={false}
          animate={{ height: long && !open ? COLLAPSED_H : "auto" }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="relative overflow-hidden"
          style={long && !open ? { maskImage: "linear-gradient(to bottom, black 55%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent)" } : undefined}
        >
          <div ref={body}>
            <Markdown text={m.text} className="text-[14.5px] leading-[1.6]" />
          </div>
        </motion.div>
        {long && (
          <button onClick={() => setOpen(!open)} className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium opacity-80 hover:opacity-100">
            {open ? "Show less" : "Show more"}
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="size-3.5" />
            </motion.span>
          </button>
        )}
      </div>
    </div>
  )
}

const TONE_ICON: Record<NonNullable<ActionLog["tone"]>, React.ComponentType<{ className?: string }>> = {
  create: Sparkles,
  mark: MessageSquareText,
  note: StickyNote,
  figma: Figma,
  error: AlertCircle,
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick} aria-label={label} className="text-muted-foreground hover:text-foreground hover:bg-accent grid size-7 place-items-center rounded-md transition-colors">
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function AssistantMessage({ m, convId }: { m: ChatMessage; convId: string }) {
  const focusNode = useStore((s) => s.focusNode)
  const [copied, setCopied] = useState(false)
  const retry = () => {
    const c = useStore.getState().conversations.find((x) => x.id === convId)!
    const idx = c.messages.findIndex((x) => x.id === m.id)
    const prevUser = [...c.messages.slice(0, idx)].reverse().find((x) => x.role === "user")
    useStore.getState().updateConversation(convId, (cc) => ({ ...cc, messages: cc.messages.filter((x) => x.id !== m.id) }))
    if (prevUser) runChat(convId, prevUser)
  }
  const copy = () => {
    navigator.clipboard
      ?.writeText(m.text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      })
      .catch(() => toast.error("Couldn't copy here."))
  }
  return (
    <div className="group/msg min-w-0">
      {m.parts?.length ? (
        <div className="flex flex-col gap-4">
          {m.parts.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: EASE_OUT }}>
              <PartView part={p} loc={{ convId, msgId: m.id }} />
            </motion.div>
          ))}
        </div>
      ) : (
        m.text && <Markdown text={m.text} className="text-[14.5px] leading-[1.65]" />
      )}
      <AnimatePresence initial={false}>
        {m.status === "streaming" && m.activity && (
          <motion.div
            key={m.activity}
            initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(3px)" }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="mt-2 flex items-center gap-2 text-[13px]"
          >
            <Loader2 className="text-ember size-3.5 animate-spin" />
            <span className="shimmer-text font-medium">{m.activity}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {!!m.actions?.length && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.actions.map((a) => {
            const Icon = TONE_ICON[a.tone ?? "create"]
            return (
              <button
                key={a.id}
                disabled={!a.targetId}
                onClick={() => a.targetId && focusNode(a.targetId)}
                className={cn("hover:bg-accent inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors disabled:cursor-default", a.tone === "error" && "text-destructive")}
              >
                <Icon className={cn("size-3.5", a.tone === "create" ? "text-ember" : "text-muted-foreground")} />
                {a.label}
              </button>
            )
          })}
        </div>
      )}
      {m.status === "error" && (
        <div className="border-destructive/30 bg-destructive/5 mt-2 rounded-2xl border p-3.5 text-[13px] leading-relaxed">
          <div className="text-destructive font-medium">The agent couldn't answer</div>
          <div className="text-muted-foreground mt-0.5">{m.error}</div>
          <Button size="sm" variant="outline" className="mt-2 h-8 rounded-full" onClick={retry}>
            <RotateCcw /> Try again
          </Button>
        </div>
      )}
      {m.status === "done" && m.text.trim() && (
        <div className="mt-1.5 -ml-1.5 flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover/msg:opacity-100 md:focus-within:opacity-100">
          <IconAction label={copied ? "Copied" : "Copy"} onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </IconAction>
          <IconAction label="Read aloud" onClick={() => speak(m.text)}>
            <Volume2 className="size-3.5" />
          </IconAction>
          <IconAction label="Try again" onClick={retry}>
            <RotateCcw className="size-3.5" />
          </IconAction>
          {m.model && <span className="text-muted-foreground ml-1.5 truncate text-[11.5px]">{m.model}</span>}
        </div>
      )}
    </div>
  )
}

// ───────────────────────────── composer ─────────────────────────────

function Composer({ busy }: { busy: boolean }) {
  const conv = useActiveConversation()
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const product = useStore((s) => s.product)
  const settings = useStore((s) => s.settings)
  const patchProduct = useStore((s) => s.patchProduct)
  const patchSettings = useStore((s) => s.patchSettings)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const updateConversation = useStore((s) => s.updateConversation)
  const [text, setText] = useState("")
  const [files, setFiles] = useState<Extract<Attachment, { kind: "file" }>[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [figmaOpen, setFigmaOpen] = useState(false)
  const [voice, setVoice] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  const imgInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const base = useRef("")
  const voiceTimer = useRef(0)
  const latest = useRef({ text: "", send: () => {} })

  const dictation = useDictation((finalText, interim) => {
    setText(`${base.current}${base.current && !base.current.endsWith(" ") ? " " : ""}${finalText}${interim}`)
    // In voice mode, send once the speaker pauses.
    if (voiceRef.current && finalText.trim()) {
      clearTimeout(voiceTimer.current)
      voiceTimer.current = window.setTimeout(() => latest.current.send(), 1300)
    }
  })
  const voiceRef = useRef(false)
  voiceRef.current = voice

  const selectedFrames = useMemo(() => conv.canvas.nodes.filter((n): n is FrameNode => n.kind === "frame" && selection.includes(n.id)), [conv.canvas.nodes, selection])

  useEffect(() => {
    const onCompose = (e: Event) => {
      setText((e as CustomEvent<{ text: string }>).detail.text)
      requestAnimationFrame(() => ta.current?.focus())
    }
    window.addEventListener("das:compose", onCompose)
    return () => window.removeEventListener("das:compose", onCompose)
  }, [])

  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = Math.min(220, el.scrollHeight) + "px"
  }, [text])

  // Voice mode: after the agent replies (and finishes speaking), listen again.
  useEffect(() => {
    if (!voice || busy) return
    const t = window.setInterval(() => {
      if (!window.speechSynthesis?.speaking && !dictation.listening) {
        base.current = ""
        dictation.start()
      }
    }, 400)
    return () => clearInterval(t)
  }, [voice, busy, dictation])

  const productReady = product.useInConversations && !!(product.about || product.screens.length || product.designSystem.profile)
  const figmaCanComment = !!conv.figma && hasFigmaAccess(settings.figmaToken)

  const send = () => {
    const body = text.trim()
    if (!body || busy) return
    clearTimeout(voiceTimer.current)
    if (dictation.listening) dictation.stop()
    const attachments: Attachment[] = [
      ...selectedFrames.map((f) => ({ kind: "frame" as const, frameId: f.id, title: frameLabel(f) })),
      ...files,
      ...(conv.figma ? [{ kind: "figma" as const, url: conv.figma.url, fileKey: conv.figma.fileKey, nodeId: conv.figma.nodeId, title: conv.figma.fileName ?? "Figma file" }] : []),
      ...(productReady ? [{ kind: "product" as const, title: "Context file" }] : []),
    ]
    const msg: ChatMessage = { id: uid("c_"), role: "user", text: body, attachments, createdAt: Date.now(), status: "done" }
    useStore.getState().addMessage(msg, conv.id)
    setText("")
    base.current = ""
    setFiles([])
    runChat(conv.id, msg)
  }
  latest.current = { text, send }

  const toggleVoice = () => {
    if (voice) {
      setVoice(false)
      dictation.stop()
      clearTimeout(voiceTimer.current)
      return
    }
    if (!dictation.supported) {
      toast.error("Voice isn't supported in this browser. Try Chrome or Edge.")
      return
    }
    patchSettings({ speakReplies: true })
    base.current = text
    if (dictation.start()) {
      setVoice(true)
      toast("Voice mode on", { description: "Talk, pause to send. Replies are read aloud." })
    } else toast.error("Microphone isn't available here.")
  }

  const onContextFiles = async (list: File[]) => {
    for (const f of list) {
      if (f.size > 12 * 1024 * 1024) {
        toast.error(`${f.name} is over 12 MB. Try a smaller file.`)
        continue
      }
      try {
        if (isTextFile(f)) {
          const t = await readAsText(f)
          setFiles((x) => [...x, { kind: "file", name: f.name, mime: f.type || "text/plain", size: f.size, text: t }])
        } else if (f.type.startsWith("image/") || f.type === "application/pdf") {
          const d = await readAsDataUrl(f)
          setFiles((x) => [...x, { kind: "file", name: f.name, mime: f.type, size: f.size, dataUrl: d }])
        } else {
          toast.error(`Can't read ${f.name}. Upload text, Markdown, CSV, JSON, PDF or images.`)
        }
      } catch {
        toast.error(`Couldn't read ${f.name}.`)
      }
    }
  }

  const hasText = !!text.trim()
  const primaryState = busy ? "stop" : hasText ? "send" : voice ? "voice-on" : "voice"

  return (
    <div className="px-4 pb-4">
      <div
        className={cn(
          "bg-background focus-within:border-ring/60 mx-auto max-w-[760px] rounded-[24px] border shadow-md transition-[border-color,box-shadow] focus-within:shadow-lg",
          voice && "border-pin/50",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onContextFiles([...e.dataTransfer.files])
        }}
      >
        {(selectedFrames.length > 0 || files.length > 0 || productReady || conv.figma) && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {selectedFrames.length > 0 && (
              <span className="bg-muted inline-flex h-7 items-center gap-1.5 rounded-full pr-1 pl-1 text-[12px] font-medium">
                <span className="flex -space-x-1.5">
                  {selectedFrames.slice(0, 3).map((f) => (
                    <span key={f.id} className="bg-card ring-muted relative size-5 overflow-hidden rounded-full ring-2">
                      {f.src ? <img src={f.src} alt="" className="h-full w-full object-cover object-top" /> : <LayoutGrid className="text-muted-foreground m-0.5 size-4" />}
                    </span>
                  ))}
                </span>
                {selectedFrames.length === 1 ? frameLabel(selectedFrames[0]) : `${selectedFrames.length} frames selected`}
                <button className="hover:bg-background rounded-full p-0.5" onClick={() => select([])} aria-label="Clear selection">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {files.map((f, i) => (
              <span key={i} className="bg-muted inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-full px-2.5 text-[12px]">
                <FileText className="size-3.5 shrink-0" />
                <span className="truncate">{f.name}</span>
                <span className="text-muted-foreground tabular shrink-0">{formatBytes(f.size)}</span>
                <button className="hover:bg-background rounded-full p-0.5" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {conv.figma && (
              <span className="bg-muted inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-full px-2.5 text-[12px]">
                <Figma className="size-3.5 shrink-0" />
                <span className="truncate">{conv.figma.fileName ?? "Figma file"}</span>
                <button className="hover:bg-background rounded-full p-0.5" onClick={() => updateConversation(conv.id, (c) => ({ ...c, figma: undefined }))} aria-label="Unlink Figma file">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {productReady && (
              <span className="text-muted-foreground inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed px-2.5 text-[12px]">
                <Package className="size-3.5" />
                Context file
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ta}
          id="composer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder={voice ? "Listening…" : selectedFrames.length ? "Ask about the selected frames" : "Ask anything"}
          className="placeholder:text-muted-foreground block max-h-[220px] min-h-[48px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed outline-none"
        />

        <div className="flex items-center gap-1 px-2.5 pb-2.5">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-full [&_svg]:size-5" aria-label="Add files and settings">
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-72 rounded-2xl p-1.5">
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => imgInput.current?.click()}>
                <ImagePlus /> Add screenshots to canvas
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => fileInput.current?.click()}>
                <Paperclip /> Upload files and context
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setFigmaOpen(true)}>
                <Figma /> {conv.figma ? "Change Figma file" : "Link a Figma file"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg py-2">
                  <Cpu className="text-muted-foreground size-4" />
                  <span className="flex-1">Model</span>
                  <span className="text-muted-foreground max-w-[120px] truncate text-[12px]">{settings.selectedModel.name}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-[320px] rounded-2xl p-0">
                  <ModelList onPicked={() => setMenuOpen(false)} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-[11.5px] font-medium">For this chat</DropdownMenuLabel>
              <DropdownMenuCheckboxItem className="rounded-lg py-2" checked={product.useInConversations} onCheckedChange={(v) => patchProduct({ useInConversations: !!v })} onSelect={(e) => e.preventDefault()}>
                Use Context file
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="rounded-lg py-2"
                disabled={!figmaCanComment}
                checked={!!conv.figma?.allowComments}
                onCheckedChange={(v) => updateConversation(conv.id, (c) => ({ ...c, figma: c.figma ? { ...c.figma, allowComments: !!v } : c.figma }))}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="flex flex-col">
                  Agent can comment in Figma
                  {!figmaCanComment && <span className="text-muted-foreground text-[11px]">{conv.figma ? "Needs a Figma token" : "Link a Figma file first"}</span>}
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem className="rounded-lg py-2" checked={settings.speakReplies} onCheckedChange={(v) => patchSettings({ speakReplies: !!v })} onSelect={(e) => e.preventDefault()}>
                Read replies aloud
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setSettingsOpen(true)}>
                <Settings2 /> API keys and settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {dictation.supported && !voice && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-9 rounded-full [&_svg]:size-[18px]", dictation.listening ? "text-pin pulse-ring" : "text-muted-foreground")}
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
              </TooltipTrigger>
              <TooltipContent>{dictation.listening ? "Listening… click to stop" : "Dictate"}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <PressButton
                size="icon"
                className={cn("bg-pin hover:bg-pin/90 size-9 rounded-full text-white", primaryState === "voice-on" && "pulse-ring")}
                onClick={busy ? stopAgent : hasText ? send : toggleVoice}
                aria-label={busy ? "Stop" : hasText ? "Send" : voice ? "End voice mode" : "Start voice mode"}
              >
                <ActionSwapRollIcon value={primaryState} className="size-5">
                  {busy ? <Square className="size-3.5 fill-current" /> : hasText ? <ArrowUp className="size-5" /> : voice ? <X className="size-5" /> : <AudioLines className="size-5" />}
                </ActionSwapRollIcon>
              </PressButton>
            </TooltipTrigger>
            <TooltipContent>{busy ? "Stop" : hasText ? "Send" : voice ? "End voice mode" : "Voice mode"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <input
        ref={imgInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const list = [...(e.target.files ?? [])]
          e.target.value = ""
          if (list.length) addImageFiles(conv.id, list)
        }}
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const list = [...(e.target.files ?? [])]
          e.target.value = ""
          onContextFiles(list)
        }}
      />
      <FigmaDialog open={figmaOpen} onOpenChange={setFigmaOpen} />
    </div>
  )
}
