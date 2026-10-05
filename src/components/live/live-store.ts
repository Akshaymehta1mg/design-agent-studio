import { create } from "zustand"
import { generateText, tool, stepCountIs, type ModelMessage } from "ai"
import { z } from "zod"
import { uid, useStore, getActive } from "@/lib/store"
import { currentModel, friendlyError, NO_MODEL, productContext } from "@/lib/agent"
import { hasFigmaAccess, postComment } from "@/lib/figma"
import { addImages, addMarks } from "@/lib/canvas-actions"
import { dataUrlParts } from "@/lib/files"
import { getSpeechRecognition, type SpeechRec } from "@/hooks/use-dictation"

export interface LiveMark {
  id: string
  n: number
  x: number
  y: number
  w: number
  h: number
  label: string
}

export interface LiveTurn {
  id: string
  who: "you" | "agent" | "system"
  text: string
  marks?: LiveMark[]
  auto?: boolean
  at: number
}

type Phase = "idle" | "listening" | "thinking" | "speaking" | "muted"

interface LiveState {
  status: "setup" | "live"
  source: "screen" | "image" | null
  stream: MediaStream | null
  imageSrc: string | null
  phase: Phase
  interim: string
  turns: LiveTurn[]
  marks: LiveMark[]
  answerAloud: boolean
  figmaComments: boolean
  speakOnChange: boolean
  error: string | null
  set: (p: Partial<LiveState>) => void
}

export const useLive = create<LiveState>((set) => ({
  status: "setup",
  source: null,
  stream: null,
  imageSrc: null,
  phase: "idle",
  interim: "",
  turns: [],
  marks: [],
  answerAloud: true,
  figmaComments: false,
  speakOnChange: false,
  error: null,
  set: (p) => set(p),
}))

// ───────── media refs (kept outside React state) ─────────
export const media = {
  video: null as HTMLVideoElement | null,
  image: null as HTMLImageElement | null,
  rec: null as SpeechRec | null,
  diffTimer: 0 as number,
  sendTimer: 0 as number,
  pending: "",
  lastSample: null as Float32Array | null,
  changedAt: 0,
  changed: false,
  lastAuto: 0,
}

const addTurn = (t: Omit<LiveTurn, "id" | "at">) => useLive.setState((s) => ({ turns: [...s.turns, { ...t, id: uid("t_"), at: Date.now() }] }))

// ───────── capture ─────────
export function captureFrame(maxSide = 1400): { src: string; w: number; h: number } | null {
  const el = media.video && media.video.videoWidth ? media.video : media.image
  if (!el) return null
  const w0 = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth
  const h0 = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight
  if (!w0 || !h0) return null
  const s = Math.min(1, maxSide / Math.max(w0, h0))
  const c = document.createElement("canvas")
  c.width = Math.round(w0 * s)
  c.height = Math.round(h0 * s)
  c.getContext("2d")!.drawImage(el, 0, 0, c.width, c.height)
  try {
    return { src: c.toDataURL("image/jpeg", 0.78), w: c.width, h: c.height }
  } catch {
    return null
  }
}

function sampleGray(): Float32Array | null {
  const el = media.video
  if (!el || !el.videoWidth) return null
  const c = document.createElement("canvas")
  c.width = 48
  c.height = 27
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(el, 0, 0, 48, 27)
  const d = ctx.getImageData(0, 0, 48, 27).data
  const out = new Float32Array(48 * 27)
  for (let i = 0; i < out.length; i++) out[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255
  return out
}

/** Watch for design changes: coarse frame diff, then wait until the screen settles. */
function startChangeWatch() {
  stopChangeWatch()
  media.diffTimer = window.setInterval(() => {
    const cur = sampleGray()
    if (!cur) return
    if (media.lastSample) {
      let diff = 0
      for (let i = 0; i < cur.length; i++) diff += Math.abs(cur[i] - media.lastSample[i])
      diff /= cur.length
      if (diff > 0.035) {
        media.changed = true
        media.changedAt = Date.now()
        // what we pointed at may have moved
        if (useLive.getState().marks.length) useLive.setState({ marks: [] })
      }
    }
    media.lastSample = cur
    const s = useLive.getState()
    const settled = media.changed && Date.now() - media.changedAt > 2200
    if (settled) {
      media.changed = false
      if (s.speakOnChange && s.phase !== "thinking" && s.phase !== "speaking" && Date.now() - media.lastAuto > 20000) {
        media.lastAuto = Date.now()
        runLiveTurn("The design on screen just changed. In one or two sentences, react to what changed: better, worse, or a question.", true)
      }
    }
  }, 1000)
}
function stopChangeWatch() {
  if (media.diffTimer) clearInterval(media.diffTimer)
  media.diffTimer = 0
  media.lastSample = null
}

// ───────── speech in ─────────
export function startListening() {
  const SR = getSpeechRecognition()
  if (!SR) return false
  stopListening()
  const r = new SR()
  r.continuous = true
  r.interimResults = true
  r.lang = navigator.language || "en-US"
  r.onresult = (e) => {
    const phase = useLive.getState().phase
    if (phase === "speaking" || phase === "muted") return
    let interim = ""
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) media.pending += " " + res[0].transcript
      else interim += res[0].transcript
    }
    useLive.setState({ interim: (media.pending + " " + interim).trim() })
    clearTimeout(media.sendTimer)
    // Send once the speaker pauses.
    media.sendTimer = window.setTimeout(() => {
      const text = media.pending.trim()
      if (text && useLive.getState().phase !== "thinking") {
        media.pending = ""
        useLive.setState({ interim: "" })
        runLiveTurn(text)
      }
    }, 1300)
  }
  r.onend = () => {
    // Chrome ends recognition after silence; keep it going while live.
    if (useLive.getState().status === "live" && media.rec === r && useLive.getState().phase !== "muted") {
      try {
        r.start()
      } catch {
        /* already started */
      }
    }
  }
  r.onerror = (e) => {
    if (e.error === "not-allowed") useLive.setState({ error: "Microphone access was blocked. Allow it in the browser, or type below." })
  }
  try {
    r.start()
    media.rec = r
    useLive.setState({ phase: "listening" })
    return true
  } catch {
    return false
  }
}
export function stopListening() {
  const r = media.rec
  media.rec = null
  try {
    r?.abort()
  } catch {
    /* ignore */
  }
}

// ───────── speech out ─────────
function say(text: string) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window) || !useLive.getState().answerAloud) return resolve()
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.05
    u.onend = () => resolve()
    u.onerror = () => resolve()
    useLive.setState({ phase: "speaking" })
    window.speechSynthesis.speak(u)
  })
}

// ───────── session ─────────
export async function startScreenShare() {
  useLive.setState({ error: null })
  if (!navigator.mediaDevices?.getDisplayMedia) {
    useLive.setState({ error: "Screen sharing isn't available here. It needs a desktop browser, and the hosted preview blocks it. Try it with an image instead, or run the app locally." })
    return
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false })
    stream.getVideoTracks()[0]?.addEventListener("ended", endSession)
    useLive.setState({ stream, source: "screen", status: "live", turns: [], marks: [] })
    addTurn({ who: "system", text: "Sharing your screen. Talk me through it." })
    startChangeWatch()
    if (!startListening()) useLive.setState({ phase: "idle", error: "Voice input isn't supported in this browser. Type below instead." })
  } catch (e) {
    const name = (e as Error).name
    useLive.setState({
      error: name === "NotAllowedError" ? "Screen sharing was cancelled or blocked. Try again and pick the Figma window or tab." : `Couldn't start screen sharing (${(e as Error).message}).`,
    })
  }
}

export function startWithImage(src: string) {
  useLive.setState({ imageSrc: src, source: "image", status: "live", turns: [], marks: [], error: null })
  addTurn({ who: "system", text: "Using a still image. Ask about it, or speak if your mic is available." })
  if (!startListening()) useLive.setState({ phase: "idle" })
}

export function endSession() {
  const s = useLive.getState()
  s.stream?.getTracks().forEach((t) => t.stop())
  stopListening()
  stopChangeWatch()
  clearTimeout(media.sendTimer)
  media.pending = ""
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
  useLive.setState({ status: "setup", stream: null, source: null, imageSrc: null, phase: "idle", interim: "", marks: [] })
}

export function toggleMute() {
  const s = useLive.getState()
  if (s.phase === "muted") {
    useLive.setState({ phase: "listening" })
    startListening()
  } else {
    stopListening()
    useLive.setState({ phase: "muted", interim: "" })
  }
}

/** Put the current frame and the agent's marks on the conversation canvas. */
export async function snapshotToCanvas() {
  const frame = captureFrame(2000)
  if (!frame) return
  const conv = getActive()
  const [id] = await addImages(conv.id, [{ src: frame.src, w: frame.w, h: frame.h, title: `Live crit ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` }], "live")
  const marks = useLive.getState().marks
  if (id && marks.length) addMarks(conv.id, id, marks.map((m) => ({ type: "annotation" as const, x: m.x, y: m.y, w: m.w, h: m.h, text: m.label, severity: "major" as const })))
  return id
}

// ───────── one live turn ─────────
const LIVE_SYSTEM = (ctx: string, figma: boolean) => `You are Prism, a senior product designer sitting next to the designer in a live critique. You see their shared screen (usually Figma) each time they speak.

- Answer in 1–3 short spoken sentences. No markdown, no lists, no preamble. Sound like a lead talking, not a report.
- Be specific to what's on screen. If you point at something, call mark_screen with its region (fractions 0–1 of the screenshot) so it's highlighted while you talk. Up to 3 marks.
- If you can't see enough, say what you'd need.${figma ? "\n- When the designer asks you to leave a comment, or when a point is worth keeping, call figma_comment with a concise, standalone comment." : ""}
${ctx ? `\nProduct context:\n${ctx}` : ""}`

export async function runLiveTurn(text: string, auto = false) {
  if (!auto) addTurn({ who: "you", text })
  useLive.setState({ phase: "thinking" })
  const frame = captureFrame()
  const { model } = currentModel()
  const conv = getActive()
  const token = useStore.getState().settings.figmaToken
  const figmaOn = useLive.getState().figmaComments && !!conv.figma && hasFigmaAccess(token)
  let marks: LiveMark[] = []
  let reply = ""
  try {
    if (!model) {
      throw new Error(NO_MODEL)
    } else {
      const history: ModelMessage[] = useLive
        .getState()
        .turns.filter((t) => t.who !== "system")
        .slice(-8, auto ? undefined : -1)
        .map((t) => ({ role: t.who === "you" ? "user" : "assistant", content: t.text }) as ModelMessage)
      const d = frame ? dataUrlParts(frame.src) : null
      const tools = {
        mark_screen: tool({
          description: "Highlight regions of the current screen while you talk about them.",
          inputSchema: z.object({ marks: z.array(z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(), label: z.string() })).max(3) }),
          execute: async ({ marks: ms }) => {
            const norm = (v: number) => Math.max(0, Math.min(1, v > 1 ? v / 100 : v))
            marks = ms.map((m, i) => ({ id: uid(), n: i + 1, x: norm(m.x), y: norm(m.y), w: norm(m.w), h: norm(m.h), label: m.label }))
            useLive.setState({ marks })
            return "Highlighted."
          },
        }),
        ...(figmaOn
          ? {
              figma_comment: tool({
                description: "Post a comment in the linked Figma file.",
                inputSchema: z.object({ message: z.string() }),
                execute: async ({ message }) => {
                  try {
                    await postComment(conv.figma!.fileKey, token, message, conv.figma!.nodeId)
                    addTurn({ who: "system", text: `Commented in Figma: "${message}"` })
                    return "Posted."
                  } catch (e) {
                    return `Failed: ${(e as Error).message}`
                  }
                },
              }),
            }
          : {}),
      }
      const res = await generateText({
        model,
        system: LIVE_SYSTEM(productContext(useStore.getState().product), figmaOn),
        messages: [
          ...history,
          { role: "user", content: [...(d ? [{ type: "image", image: d.base64, mediaType: d.mediaType }] : []), { type: "text", text }] as never },
        ],
        tools,
        stopWhen: stepCountIs(3),
        maxOutputTokens: 600,
      })
      reply = res.text.trim() || "Marked it on screen."
    }
    useLive.setState({ marks })
    addTurn({ who: "agent", text: reply, marks, auto })
    await say(reply)
  } catch (e) {
    addTurn({ who: "system", text: friendlyError(e) })
  } finally {
    const s = useLive.getState()
    if (s.status === "live" && s.phase !== "muted") useLive.setState({ phase: media.rec ? "listening" : "idle" })
  }
}
