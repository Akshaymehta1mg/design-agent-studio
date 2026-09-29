import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Download, ExternalLink, Play, RotateCcw, Smartphone } from "@/components/ui/icons"
import type { DesignSystem, FrameNode } from "@/lib/types"
import { useStore } from "@/lib/store"
import { allDesignSystems, wireframeVars } from "@/lib/design-systems"
import { buildPrototypeDoc } from "@/lib/wireframe"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

/** The prototype as one HTML document; `standalone` is the downloadable file. */
export function prototypeDoc(f: FrameNode, systems: DesignSystem[], standalone = false) {
  const ds = systems.find((d) => d.id === f.designSystemId)
  return buildPrototypeDoc(f.screens ?? [], f.startScreen ?? "", wireframeVars(ds), standalone ? { title: f.title, standalone: true, width: f.w } : {})
}

const fileName = (f: FrameNode) => `${f.title.replace(/[^\w -]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "prototype"}${f.version ? `-v${f.version}` : ""}.html`

export function downloadPrototype(f: FrameNode) {
  const html = prototypeDoc(f, allDesignSystems(useStore.getState().designSystems), true)
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }))
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName(f) })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function openPrototypeInTab(f: FrameNode) {
  const html = prototypeDoc(f, allDesignSystems(useStore.getState().designSystems), true)
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }))
  window.open(url, "_blank", "noopener")
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const usePrototypeFrame = (id: string | null) =>
  useStore((s) => {
    if (!id) return undefined
    const c = s.conversations.find((x) => x.id === s.activeId)
    const n = c?.canvas.nodes.find((x) => x.id === id)
    return n?.kind === "frame" && n.screens?.length ? n : undefined
  })

/** Click through every screen of a prototype, with a screen list, back and restart. */
export function PrototypePlayer() {
  const playing = useStore((s) => s.playing)
  const play = useStore((s) => s.playPrototype)
  const f = usePrototypeFrame(playing)
  const custom = useStore((s) => s.designSystems)
  const doc = useMemo(() => (f ? prototypeDoc(f, allDesignSystems(custom)) : ""), [f, custom])
  const iframe = useRef<HTMLIFrameElement>(null)
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [current, setCurrent] = useState<string | undefined>()
  const [canBack, setCanBack] = useState(false)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    setCurrent(f?.startScreen)
    setCanBack(false)
  }, [f?.id, f?.startScreen])

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow || e.data?.type !== "proto:screen") return
      setCurrent(e.data.id)
      setCanBack(!!e.data.canBack)
    }
    window.addEventListener("message", onMsg)
    return () => window.removeEventListener("message", onMsg)
  }, [])

  // Fit the device into the stage (the stage mounts with the dialog, hence the callback ref).
  const fw = f?.w ?? 0
  const fh = f?.h ?? 0
  useEffect(() => {
    if (!stage || !fw) return
    const fit = () => setScale(Math.max(0.3, Math.min(1, (stage.clientHeight - 32) / fh, (stage.clientWidth - 32) / fw)))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [stage, fw, fh])

  const send = (msg: object) => iframe.current?.contentWindow?.postMessage(msg, "*")
  const screens = f?.screens ?? []
  const index = screens.findIndex((s) => s.id === current)

  return (
    <Dialog open={!!f} onOpenChange={(o) => !o && play(null)}>
      <DialogContent showCloseButton className="flex h-[92vh] max-w-[min(1280px,96vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1280px,96vw)]">
        {f && (
          <>
            <header className="flex h-13 shrink-0 items-center gap-2 border-b py-2 pr-12 pl-4">
              <Smartphone className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-[14px]">
                  {f.title} {f.version ? <span className="text-muted-foreground font-normal">· V{f.version}</span> : null}
                </DialogTitle>
                <DialogDescription className="truncate text-[12px]">
                  {screens.length} screens · click through it like the real thing. Esc closes an open sheet, or goes back.
                </DialogDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-8" disabled={!canBack} onClick={() => send({ type: "proto:back" })}>
                <ArrowLeft /> Back
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => send({ type: "proto:restart" })}>
                <RotateCcw /> Restart
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => openPrototypeInTab(f)}>
                <ExternalLink /> New tab
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => downloadPrototype(f)}>
                <Download /> Download HTML
              </Button>
            </header>
            <div className="flex min-h-0 flex-1">
              <nav className="bg-sidebar hidden w-[220px] shrink-0 flex-col gap-px overflow-y-auto border-r p-2 md:flex" aria-label="Screens" data-scrollable>
                <div className="text-muted-foreground px-2 pt-1 pb-1.5 text-[11px] font-medium">Screens</div>
                {screens.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => send({ type: "proto:go", id: s.id })}
                    aria-current={s.id === current ? "true" : undefined}
                    className={cn("flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors", s.id === current ? "bg-sidebar-accent font-medium" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60")}
                  >
                    <span className="text-muted-foreground w-4 shrink-0 text-right text-[11px] tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    {s.id === f.startScreen && <Play className="text-muted-foreground size-3 shrink-0" aria-label="Start screen" />}
                  </button>
                ))}
              </nav>
              <div ref={setStage} className="bg-canvas relative grid min-w-0 flex-1 place-items-center overflow-hidden">
                <div className="overflow-hidden rounded-[22px] border bg-white shadow-lg" style={{ width: f.w * scale, height: f.h * scale }}>
                  <iframe
                    ref={iframe}
                    key={f.id}
                    title={`${f.title} prototype`}
                    srcDoc={doc}
                    sandbox="allow-scripts allow-forms"
                    className="origin-top-left border-0 bg-white"
                    style={{ width: f.w, height: f.h, transform: `scale(${scale})` }}
                  />
                </div>
                {index >= 0 && (
                  <div className="bg-background/90 text-muted-foreground absolute top-3 left-3 rounded-full border px-3 py-1 text-[12px] shadow-xs backdrop-blur">
                    {index + 1} / {screens.length} · {screens[index].title}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Chat card for a prototype the agent built. */
export function PrototypeCard({ frameId }: { frameId: string }) {
  const f = usePrototypeFrame(frameId)
  const play = useStore((s) => s.playPrototype)
  const focusNode = useStore((s) => s.focusNode)
  if (!f) return null
  const pending = (f.plannedScreens ?? []).filter((p) => !f.screens!.some((s) => s.id === p.id))
  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <span className="bg-ember-soft text-ember grid size-6 shrink-0 place-items-center rounded-md">
          <Smartphone className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13.5px] font-medium">
            {f.title}
            {f.version && f.version > 1 ? ` · V${f.version}` : ""}
          </div>
          <div className="text-muted-foreground text-[12px]">
            Interactive prototype · {f.screens!.length}
            {pending.length ? ` of ${f.screens!.length + pending.length}` : ""} screens
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 px-3.5 pt-2.5">
        {f.screens!.map((s) => (
          <span key={s.id} className="bg-muted text-muted-foreground max-w-[160px] truncate rounded-full px-2 py-0.5 text-[11.5px]">
            {s.title}
          </span>
        ))}
        {pending.map((s) => (
          <span key={s.id} className="text-muted-foreground/70 max-w-[160px] truncate rounded-full border border-dashed px-2 py-0.5 text-[11.5px]" title="Not built yet">
            {s.title}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 p-3">
        <Button size="sm" className="h-8 rounded-full" onClick={() => play(f.id)}>
          <Play /> Play prototype
        </Button>
        <Button variant="ghost" size="sm" className="h-8 rounded-full" onClick={() => downloadPrototype(f)}>
          <Download /> HTML
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="text-muted-foreground h-8 rounded-full" onClick={() => focusNode(f.id)}>
          View on canvas
        </Button>
      </div>
    </div>
  )
}
