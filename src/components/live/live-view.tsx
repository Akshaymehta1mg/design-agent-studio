import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Volume2, Check, Circle, Monitor, Mic, MicOff, Camera, PhoneOff, Loader2, ImageIcon, Send, AudioLines, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useActiveConversation, useStore } from "@/lib/store"
import { readAsDataUrl } from "@/lib/files"
import { cn } from "@/lib/utils"
import { hasFigmaAccess } from "@/lib/figma"
import { currentModel } from "@/lib/agent"
import { getSpeechRecognition } from "@/hooks/use-dictation"
import { useLive, media, startScreenShare, startWithImage, endSession, toggleMute, snapshotToCanvas, runLiveTurn } from "./live-store"
import { loadFigmaIntoConversation } from "@/components/chat/figma-popover"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

// ───────────────────────── center: stage ─────────────────────────

export function LiveStage() {
  const status = useLive((s) => s.status)
  return <div className="bg-canvas relative h-full w-full overflow-hidden">{status === "setup" ? <LiveSetup /> : <Stage />}</div>
}

function Check3({ ok, children, action }: { ok: boolean; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-muted/70 flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px]">
      {ok ? (
        <span className="bg-ok flex size-[18px] shrink-0 items-center justify-center rounded-full text-white">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : (
        <Circle className="text-muted-foreground size-[18px] shrink-0" />
      )}
      <span className="flex-1">{children}</span>
      {action}
    </div>
  )
}

function LiveSetup() {
  const conv = useActiveConversation()
  const settings = useStore((s) => s.settings)
  const openSettings = useStore((s) => s.setSettingsOpen)
  const { answerAloud, figmaComments, speakOnChange, error, set } = useLive()
  const [linking, setLinking] = useState(false)
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const imgInput = useRef<HTMLInputElement>(null)
  const hasKey = !!currentModel().model
  const voice = !!getSpeechRecognition() && "speechSynthesis" in window
  const canShare = !!navigator.mediaDevices?.getDisplayMedia

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6" data-scrollable>
      <div className="bg-card w-full max-w-[460px] rounded-2xl border p-6 shadow-lg">
        <h2 className="text-[26px] font-semibold">Crit it live</h2>
        <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
          Share your Figma window and talk it through. The agent sees your screen each time you speak, points at what it means, and answers out loud, like a lead sitting next to you.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Check3
            ok={hasKey}
            action={
              !hasKey && (
                <Button size="sm" variant="outline" className="h-7" onClick={() => openSettings(true)}>
                  Add key
                </Button>
              )
            }
          >
            {hasKey ? <>Using {settings.selectedModel.name}</> : "Add an API key and pick a model"}
          </Check3>
          <Check3 ok={voice}>{voice ? "Voice works in this browser" : "Voice isn't supported here; you can type"}</Check3>
          <Check3
            ok={!!conv.figma}
            action={
              !conv.figma &&
              !linking && (
                <Button size="sm" variant="outline" className="h-7" onClick={() => setLinking(true)}>
                  Link file
                </Button>
              )
            }
          >
            {conv.figma ? <>Linked to {conv.figma.fileName ?? "Figma file"}</> : "Link your Figma file so it can comment"}
          </Check3>
          {linking && !conv.figma && (
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                setLoading(true)
                try {
                  await loadFigmaIntoConversation(conv.id, url, true)
                  set({ figmaComments: true })
                  setLinking(false)
                } catch (err) {
                  toast.error((err as Error).message)
                } finally {
                  setLoading(false)
                }
              }}
            >
              <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.figma.com/design/…" className="h-9" />
              <Button type="submit" className="h-9" disabled={!url.trim() || loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Link"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3.5">
          <ToggleRow id="aloud" label="Answer out loud" checked={answerAloud} onChange={(v) => set({ answerAloud: v })} />
          <ToggleRow id="figma-c" label="Leave comments in the Figma file" checked={figmaComments} disabled={!conv.figma || !hasFigmaAccess(settings.figmaToken)} onChange={(v) => set({ figmaComments: v })} />
          <ToggleRow id="on-change" label="Speak up when the design changes" checked={speakOnChange} onChange={(v) => set({ speakOnChange: v })} />
        </div>

        {error && (
          <div className="border-destructive/30 bg-destructive/5 mt-4 flex gap-2 rounded-lg border p-3 text-[13px] leading-snug">
            <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        <Button className="mt-5 h-11 w-full rounded-full text-[14.5px]" onClick={startScreenShare}>
          <Monitor /> Share screen and start
        </Button>
        <p className="text-muted-foreground mt-2.5 text-center text-[12px] leading-snug">
          {canShare ? "Pick the Figma window or tab when your browser asks. Screen sharing needs a desktop browser." : "Screen sharing isn't available in this browser."}{" "}
          <button className="text-foreground underline underline-offset-2" onClick={() => imgInput.current?.click()}>
            Try it with an image
          </button>
        </p>
        <input
          ref={imgInput}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (f) startWithImage(await readAsDataUrl(f))
          }}
        />
      </div>
    </div>
  )
}

function ToggleRow({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <Label htmlFor={id} className={cn("text-[14px] font-normal", disabled && "opacity-50")}>
        {label}
      </Label>
    </div>
  )
}

function Stage() {
  const { stream, imageSrc, marks, phase, interim, source } = useLive()
  const box = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const [natural, setNatural] = useState({ w: 16, h: 10 })
  const [fit, setFit] = useState({ w: 0, h: 0 })

  useEffect(() => {
    if (video.current && stream) {
      video.current.srcObject = stream
      video.current.play().catch(() => {})
    }
    media.video = video.current
    media.image = img.current
    return () => {
      media.video = null
      media.image = null
    }
  }, [stream, imageSrc])

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const s = Math.min((r.width - 48) / natural.w, (r.height - 120) / natural.h)
      setFit({ w: natural.w * s, h: natural.h * s })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [natural])

  return (
    <div ref={box} className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 pb-24">
      <div className="relative rounded-xl border bg-black shadow-lg" style={{ width: fit.w, height: fit.h }}>
        {source === "screen" ? (
          <video ref={video} muted playsInline className="h-full w-full rounded-xl object-contain" onLoadedMetadata={(e) => setNatural({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })} />
        ) : (
          imageSrc && <img ref={img} src={imageSrc} alt="Shared design" className="h-full w-full rounded-xl object-contain" onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
        )}
        {marks.map((m) => (
          <div
            key={m.id}
            className="border-ember animate-in fade-in zoom-in-95 absolute rounded-md border-[2.5px] duration-300"
            style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: `${m.w * 100}%`, height: `${m.h * 100}%`, boxShadow: "0 0 0 4px color-mix(in oklch, var(--ember) 25%, transparent)" }}
          >
            <span className="bg-ember absolute -top-3 -left-3 flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white shadow">{m.n}</span>
            <span className="bg-ember absolute top-full left-0 mt-1.5 max-w-[240px] rounded-md px-2 py-1 text-[12px] leading-snug font-medium text-white shadow-lg">{m.label}</span>
          </div>
        ))}
      </div>

      {/* control bar */}
      <div className="bg-card absolute bottom-5 left-1/2 flex w-[min(640px,calc(100%-32px))] -translate-x-1/2 items-center gap-2 sm:gap-3 rounded-2xl border p-2 pl-3 shadow-lg">
        <PhasePill phase={phase} />
        <div className="flex-1 sm:hidden" />
        <div className="text-muted-foreground hidden min-w-0 flex-1 truncate text-[13px] italic sm:block">{interim || (phase === "listening" ? "Talk me through it…" : "")}</div>
        <Button variant="ghost" size="icon" className="size-9" onClick={toggleMute} aria-label={phase === "muted" ? "Unmute" : "Mute"}>
          {phase === "muted" ? <MicOff className="text-destructive" /> : <Mic />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={async () => {
            const id = await snapshotToCanvas()
            if (id) toast.success("Snapshot added to the canvas", { description: "Switch to Chat to see it with the agent's marks." })
          }}
        >
          <Camera /> <span className="hidden sm:inline">Snapshot</span>
        </Button>
        <Button variant="destructive" size="sm" className="h-9 rounded-full" onClick={endSession}>
          <PhoneOff /> <span className="hidden sm:inline">End</span>
        </Button>
      </div>
    </div>
  )
}

function PhasePill({ phase }: { phase: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    listening: { label: "Listening", icon: <AudioLines className="size-3.5" />, cls: "bg-ok/15 text-ok" },
    thinking: { label: "Looking", icon: <Loader2 className="size-3.5 animate-spin" />, cls: "bg-ember-soft text-ember" },
    speaking: { label: "Speaking", icon: <Volume2 className="size-3.5" />, cls: "bg-ember-soft text-ember" },
    muted: { label: "Muted", icon: <MicOff className="size-3.5" />, cls: "bg-muted text-muted-foreground" },
    idle: { label: "Type to talk", icon: <ImageIcon className="size-3.5" />, cls: "bg-muted text-muted-foreground" },
  }
  const p = map[phase] ?? map.idle
  return <span className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold", p.cls)}>{p.icon}{p.label}</span>
}

// ───────────────────────── right: transcript ─────────────────────────

export function LivePanel() {
  const { turns, status, phase } = useLive()
  const [text, setText] = useState("")
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [turns.length])
  return (
    <div className="bg-background flex h-full min-w-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[13.5px] font-semibold">Design Agent</div>
          <div className="text-muted-foreground text-[11.5px]">Live crit {status === "live" ? "· in session" : ""}</div>
        </div>
        {status === "live" && <span className="bg-ember pulse-ring size-2.5 rounded-full" aria-label="Live" />}
      </header>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-scrollable>
        {turns.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col justify-end gap-2 pb-2 text-[13px] leading-relaxed">
            <p className="text-foreground font-medium">How live crit works</p>
            <p>Each time you pause, the agent grabs the current frame of your shared screen, looks at it with what you said, and answers in a sentence or two. It highlights what it's talking about on the stage.</p>
            <p>Snapshot saves the frame and its marks to this conversation's canvas so you can keep iterating in Chat.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {turns.map((t) =>
              t.who === "system" ? (
                <div key={t.id} className="text-muted-foreground text-center text-[12px]">
                  {t.text}
                </div>
              ) : t.who === "you" ? (
                <div key={t.id} className="bg-muted ml-auto max-w-[88%] rounded-2xl rounded-br-md px-3.5 py-2 text-[13.5px]">
                  {t.text}
                </div>
              ) : (
                <div key={t.id} className="flex">
                  <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
                    {t.auto && <div className="eyebrow mb-0.5">Noticed a change</div>}
                    {t.text}
                    {!!t.marks?.length && (
                      <ol className="mt-1.5 flex flex-col gap-1">
                        {t.marks.map((m) => (
                          <li key={m.id} className="text-muted-foreground flex gap-1.5 text-[12.5px]">
                            <span className="bg-ember flex size-4 shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white">{m.n}</span>
                            {m.label}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              ),
            )}
            {phase === "thinking" && (
              <div className="text-muted-foreground flex items-center gap-2 text-[12.5px]">
                <Loader2 className="text-ember size-3.5 animate-spin" /> Looking at your screen…
              </div>
            )}
          </div>
        )}
      </div>
      <form
        className="shrink-0 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim() || status !== "live") return
          runLiveTurn(text.trim())
          setText("")
        }}
      >
        <div className="bg-background flex items-center gap-1 rounded-[24px] border p-2 pl-4 shadow-md">
          <input
            id="live-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={status !== "live"}
            placeholder={status === "live" ? "Type instead of speaking…" : "Start a session to talk"}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          />
          <Button type="submit" size="icon" className="size-8 rounded-full" disabled={!text.trim() || status !== "live"} aria-label="Send">
            <Send className="size-3.5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
