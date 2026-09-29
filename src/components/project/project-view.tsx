import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { ArrowLeft, Check, ChevronDown, Layers, MousePointer2, Radio, Shapes as Figma, Palette } from "@/components/ui/icons"
import { useActiveConversation, useStore } from "@/lib/store"
import { allDesignSystems } from "@/lib/design-systems"
import type { FrameNode, Mode } from "@/lib/types"
import { SPRING_LAYOUT } from "@/lib/ease"
import { cn } from "@/lib/utils"
import { Canvas } from "@/components/canvas/canvas"
import { ChatPanel } from "@/components/chat/chat-panel"
import { LivePanel, LiveStage } from "@/components/live/live-view"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { PrototypePlayer } from "@/components/canvas/prototype-player"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"

const MODES: { id: Mode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "canvas", label: "Canvas", icon: MousePointer2 },
  { id: "live", label: "Live", icon: Radio },
]

function TitleEditor() {
  const conv = useActiveConversation()
  const rename = useStore((s) => s.renameConversation)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(conv.title)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => setDraft(conv.title), [conv.title])
  const save = () => {
    setEditing(false)
    if (draft.trim() && draft !== conv.title) rename(conv.id, draft.trim())
    else setDraft(conv.title)
  }
  return editing ? (
    <input
      ref={input}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save()
        if (e.key === "Escape") {
          setDraft(conv.title)
          setEditing(false)
        }
      }}
      className="focus:ring-ring/40 h-8 min-w-0 rounded-md bg-transparent px-1.5 text-[14px] font-semibold outline-none focus:ring-2"
      aria-label="Project name"
    />
  ) : (
    <button onClick={() => setEditing(true)} className="hover:bg-accent h-8 min-w-0 truncate rounded-md px-1.5 text-[14px] font-semibold" title="Rename">
      {conv.title}
    </button>
  )
}

function DesignSystemMenu() {
  const conv = useActiveConversation()
  const custom = useStore((s) => s.designSystems)
  const def = useStore((s) => s.defaultDesignSystemId)
  const update = useStore((s) => s.updateConversation)
  const setRoute = useStore((s) => s.setRoute)
  const systems = allDesignSystems(custom)
  const current = systems.find((d) => d.id === (conv.designSystemId ?? def)) ?? systems[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hover:bg-accent inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium shadow-xs">
          <span className="flex -space-x-1">
            {current.colors.slice(0, 3).map((c) => (
              <span key={c.name} className="ring-background size-3.5 rounded-full ring-2" style={{ background: c.value }} />
            ))}
          </span>
          <span className="hidden max-w-[140px] truncate sm:inline">{current.name}</span>
          <ChevronDown className="text-muted-foreground size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
        <DropdownMenuLabel className="text-muted-foreground text-[11.5px] font-medium">Design system for this project</DropdownMenuLabel>
        {systems.map((d) => (
          <DropdownMenuItem key={d.id} className="rounded-lg py-2" onSelect={() => update(conv.id, (c) => ({ ...c, designSystemId: d.id }))}>
            <span className="flex -space-x-1">
              {d.colors.slice(0, 3).map((c) => (
                <span key={c.name} className="ring-popover size-3 rounded-full ring-2" style={{ background: c.value }} />
              ))}
            </span>
            <span className="flex-1 truncate">{d.name}</span>
            {d.id === current.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setRoute("design-systems")}>
          <Palette /> Manage design systems
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ProjectView() {
  const conv = useActiveConversation()
  const mode = useStore((s) => s.mode)
  const setRoute = useStore((s) => s.setRoute)
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  const isMobile = useIsMobile()
  const [pane, setPane] = useState<"main" | "side">("main")
  const frames = conv.canvas.nodes.filter((n) => n.kind === "frame") as FrameNode[]

  const askAbout = (f: FrameNode) => {
    select([f.id])
    setPane("side")
    window.dispatchEvent(new CustomEvent("das:compose", { detail: { text: f.type === "wireframe" ? "Critique this version and suggest what the next one should change." : "What would you change on this screen?" } }))
  }

  const main = mode === "live" ? <LiveStage /> : <Canvas onAskAbout={askAbout} />
  const side = mode === "live" ? <LivePanel /> : <ChatPanel />

  return (
    <div className="bg-background flex h-full flex-col">
      <PrototypePlayer />
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => setRoute("home")} aria-label="Back to Home">
          <ArrowLeft />
        </Button>
        <button onClick={() => setRoute("files")} className="text-muted-foreground hover:text-foreground hidden text-[13.5px] sm:inline">
          Files
        </button>
        <span className="text-muted-foreground hidden sm:inline">/</span>
        <div className="min-w-0">
          <TitleEditor />
        </div>

        <div className="bg-muted mx-auto flex rounded-full p-0.5" role="tablist" aria-label="Mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => useStore.setState({ mode: m.id })}
              className={cn("relative flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors", mode === m.id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {mode === m.id && <motion.span layoutId="project-mode" transition={SPRING_LAYOUT} className="bg-background absolute inset-0 rounded-full shadow-sm" />}
              <span className="relative flex items-center gap-1.5">
                <m.icon className="size-3.5" />
                {m.label}
                {m.id === "live" && <span className="bg-ember size-1.5 rounded-full" />}
              </span>
            </button>
          ))}
        </div>

        <div className="text-muted-foreground tabular hidden items-center gap-3 text-[12.5px] lg:flex">
          {conv.figma && (
            <span className="inline-flex items-center gap-1">
              <Figma className="size-3.5" /> {conv.figma.fileName ?? "Figma"}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Layers className="size-3.5" />
            {frames.length} frame{frames.length === 1 ? "" : "s"}
          </span>
          {selection.length > 0 && <span className="text-pin font-medium">{selection.length} selected</span>}
        </div>
        <DesignSystemMenu />
      </header>

      <div className="min-h-0 flex-1">
        {isMobile ? (
          <div className="flex h-full flex-col">
            <div className="bg-muted m-2 grid shrink-0 grid-cols-2 rounded-lg p-0.5">
              {(["main", "side"] as const).map((p) => (
                <button key={p} onClick={() => setPane(p)} className={cn("rounded-md py-1.5 text-[13px] font-medium", pane === p ? "bg-background shadow-xs" : "text-muted-foreground")}>
                  {p === "main" ? (mode === "live" ? "Stage" : "Canvas") : mode === "live" ? "Transcript" : "Chat"}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">{pane === "main" ? main : side}</div>
          </div>
        ) : (
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel id="center" minSize={360}>
              {main}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="right" defaultSize={420} minSize={340} maxSize={680}>
              {side}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  )
}
