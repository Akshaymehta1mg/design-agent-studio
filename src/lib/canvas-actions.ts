import type { ActionLog, FrameNode, Mark, NoteNode, Device } from "./types"
import { frameLabel, placeNewRow, placeNextVersion, findFreeSpot, uid, useStore } from "./store"
import { DEVICE_SIZES, sanitizeWireframe } from "./wireframe"
import { hasFigmaAccess, postComment } from "./figma"

/**
 * The only ways the agent can change the canvas. There is deliberately no
 * "edit wireframe" action: iterating always produces a new version beside the
 * old one, so V1, V2, V3 stay visible as a history.
 */

const conv = (convId: string) => useStore.getState().conversations.find((c) => c.id === convId)

function findFrame(convId: string, frameId: string): FrameNode | undefined {
  const c = conv(convId)
  const n = c?.canvas.nodes.find((x) => x.id === frameId || x.id.endsWith(frameId))
  return n?.kind === "frame" ? n : undefined
}

const dsIdFor = (convId: string) => conv(convId)?.designSystemId ?? useStore.getState().defaultDesignSystemId

export type ActionResult = { ok: boolean; message: string; log?: ActionLog }

export function createWireframe(convId: string, input: { title: string; html: string; device?: Device; summary?: string; height?: number }): ActionResult {
  const device = input.device ?? "mobile"
  const size = DEVICE_SIZES[device]
  const nodes = conv(convId)?.canvas.nodes ?? []
  const h = Math.max(size.h, Math.min(input.height ?? size.h, 4000))
  const pos = placeNewRow(nodes, size.w, h)
  const frame: FrameNode = {
    id: uid("f_"),
    kind: "frame",
    type: "wireframe",
    ...pos,
    w: size.w,
    h,
    title: input.title.slice(0, 60),
    html: sanitizeWireframe(input.html),
    device,
    source: "agent",
    designSystemId: dsIdFor(convId),
    lineageId: uid("l_"),
    version: 1,
    changeSummary: input.summary,
    createdAt: Date.now(),
  }
  useStore.getState().editCanvas((d) => ({ ...d, nodes: [...d.nodes, frame] }), { convId })
  useStore.getState().focusNode(frame.id)
  return { ok: true, message: `Created ${frameLabel(frame)} (id ${frame.id}).`, log: { id: uid(), label: `Created ${frameLabel(frame)}`, targetId: frame.id, tone: "create" } }
}

export function iterateWireframe(convId: string, input: { source_frame_id: string; html: string; change_summary: string; title?: string; device?: Device; height?: number }): ActionResult {
  const src = findFrame(convId, input.source_frame_id)
  if (!src) return { ok: false, message: `No frame with id ${input.source_frame_id}. Use create_wireframe for a new idea, or pick an id from the canvas list.` }
  const nodes = conv(convId)!.canvas.nodes
  // Screenshots can be iterated too: the first wireframe becomes a new lineage rooted at the screenshot.
  const lineageId = src.lineageId ?? uid("l_")
  const lineage = nodes.filter((n): n is FrameNode => n.kind === "frame" && n.lineageId === lineageId)
  const version = src.lineageId ? Math.max(...lineage.map((f) => f.version ?? 1)) + 1 : 2
  const device = input.device ?? src.device ?? (src.w < 600 ? "mobile" : "desktop")
  const size = DEVICE_SIZES[device]
  const h = Math.max(size.h, Math.min(input.height ?? size.h, 4000))
  let patchSrc: FrameNode | null = null
  if (!src.lineageId) patchSrc = { ...src, lineageId, version: 1 }
  const pos = src.lineageId ? placeNextVersion(nodes, lineageId, size.w, h) : findFreeSpot(nodes, { x: src.x + src.w + 120, y: src.y, w: size.w, h }, "right")
  const frame: FrameNode = {
    id: uid("f_"),
    kind: "frame",
    type: "wireframe",
    ...pos,
    w: size.w,
    h,
    title: (input.title ?? src.title).slice(0, 60),
    html: sanitizeWireframe(input.html),
    device,
    source: "agent",
    designSystemId: dsIdFor(convId),
    lineageId,
    version,
    parentId: src.id,
    changeSummary: input.change_summary,
    createdAt: Date.now(),
  }
  useStore.getState().editCanvas(
    (d) => ({ ...d, nodes: [...d.nodes.map((n) => (patchSrc && n.id === patchSrc.id ? patchSrc : n)), frame] }),
    { convId },
  )
  useStore.getState().focusNode(frame.id)
  return {
    ok: true,
    message: `Created ${frameLabel(frame)} (id ${frame.id}) next to ${frameLabel(src)}, which is unchanged.`,
    log: { id: uid(), label: `Created ${frameLabel(frame)}`, targetId: frame.id, tone: "create" },
  }
}

const clamp = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))

export function addMarks(
  convId: string,
  frameId: string,
  marks: { type: "annotation" | "comment"; x: number; y: number; w?: number; h?: number; text: string; severity?: Mark["severity"] }[],
  author: "agent" | "user" = "agent",
): ActionResult {
  const f = findFrame(convId, frameId)
  if (!f) return { ok: false, message: `No frame with id ${frameId}.` }
  const existing = conv(convId)!.canvas.marks.filter((m) => m.frameId === f.id)
  let n = existing.reduce((a, m) => Math.max(a, m.n), 0)
  const created: Mark[] = marks.map((m) => {
    // accept 0–100 as well as 0–1
    const norm = (v: number | undefined) => (v === undefined ? undefined : clamp(v > 1 ? v / 100 : v))
    return {
      id: uid("m_"),
      frameId: f.id,
      type: m.type,
      x: norm(m.x)!,
      y: norm(m.y)!,
      w: norm(m.w),
      h: norm(m.h),
      text: m.text,
      severity: m.severity,
      author,
      n: ++n,
      createdAt: Date.now(),
    }
  })
  useStore.getState().editCanvas((d) => ({ ...d, marks: [...d.marks, ...created] }), { convId })
  const kind = created.every((m) => m.type === "comment") ? "comment" : created.every((m) => m.type === "annotation") ? "annotation" : "mark"
  return {
    ok: true,
    message: `Added ${created.length} ${kind}${created.length === 1 ? "" : "s"} to ${frameLabel(f)}.`,
    log: { id: uid(), label: `${created.length} ${kind}${created.length === 1 ? "" : "s"} on ${frameLabel(f)}`, targetId: f.id, tone: "mark" },
  }
}

export function addNote(convId: string, input: { title?: string; text: string; near_frame_id?: string }, author: "agent" | "user" = "agent"): ActionResult {
  const c = conv(convId)
  if (!c) return { ok: false, message: "No conversation" }
  const near = input.near_frame_id ? findFrame(convId, input.near_frame_id) : undefined
  const lines = input.text.split("\n").length
  const h = Math.min(420, 70 + lines * 20 + Math.ceil(input.text.length / 34) * 6)
  const pos = near
    ? findFreeSpot(c.canvas.nodes, { x: near.x + near.w + 40, y: near.y, w: 260, h })
    : placeNewRow(c.canvas.nodes, 260, h)
  const note: NoteNode = { id: uid("n_"), kind: "note", ...pos, w: 260, h, title: input.title, text: input.text, author, createdAt: Date.now() }
  useStore.getState().editCanvas((d) => ({ ...d, nodes: [...d.nodes, note] }), { convId })
  return { ok: true, message: `Added note${input.title ? ` "${input.title}"` : ""}.`, log: { id: uid(), label: `Note${input.title ? `: ${input.title}` : ""}`, targetId: note.id, tone: "note" } }
}

export async function figmaComment(convId: string, input: { message: string; frame_id?: string }): Promise<ActionResult> {
  const c = conv(convId)
  const token = useStore.getState().settings.figmaToken
  if (!c?.figma?.allowComments) return { ok: false, message: "Figma comments are turned off for this conversation." }
  if (!hasFigmaAccess(token)) return { ok: false, message: "No Figma token in Settings." }
  const f = input.frame_id ? findFrame(convId, input.frame_id) : undefined
  const nodeId = f?.figma?.nodeId ?? c.figma.nodeId
  try {
    await postComment(c.figma.fileKey, token, input.message, nodeId)
    return { ok: true, message: "Comment posted to Figma.", log: { id: uid(), label: "Commented in Figma", tone: "figma" } }
  } catch (e) {
    return { ok: false, message: (e as Error).message, log: { id: uid(), label: "Figma comment failed", tone: "error" } }
  }
}

// ───────── user-driven additions ─────────
import { imageFileToFrameData, canvasSizeFor } from "./files"
import { placeRow } from "./store"
import type { FrameSource } from "./types"

/** Add images to the canvas in a row, select them, and return their ids. */
export async function addImages(
  convId: string,
  items: { src: string; w: number; h: number; title: string; figma?: FrameNode["figma"] }[],
  source: FrameSource,
  at?: { x: number; y: number },
): Promise<string[]> {
  if (!items.length) return []
  const nodes = conv(convId)?.canvas.nodes ?? []
  const sizes = items.map((i) => canvasSizeFor(i.w, i.h))
  let positions = placeRow(nodes, sizes)
  if (at) {
    let x = at.x
    positions = sizes.map((s) => {
      const p = { x, y: at.y }
      x += s.w + 80
      return p
    })
  }
  const frames: FrameNode[] = items.map((it, i) => ({
    id: uid("f_"),
    kind: "frame",
    type: "image",
    ...positions[i],
    ...sizes[i],
    title: it.title.replace(/\.(png|jpe?g|webp|gif)$/i, "").slice(0, 60),
    src: it.src,
    source,
    figma: it.figma,
    createdAt: Date.now(),
  }))
  useStore.getState().editCanvas((d) => ({ ...d, nodes: [...d.nodes, ...frames] }), { convId })
  useStore.getState().select(frames.map((f) => f.id))
  useStore.getState().focusNode(frames[0].id)
  return frames.map((f) => f.id)
}

export async function addImageFiles(convId: string, files: File[], at?: { x: number; y: number }) {
  const imgs = files.filter((f) => f.type.startsWith("image/"))
  const items = await Promise.all(
    imgs.map(async (f) => {
      const d = await imageFileToFrameData(f)
      return { ...d, title: f.name || "Screenshot" }
    }),
  )
  return addImages(convId, items, "upload", at)
}

// ───────── workflows ─────────
import type { Workflow } from "./types"
import { layoutWorkflow } from "@/components/agents/workflow-graph"

export function createWorkflow(convId: string, wf: Workflow): ActionResult & { frameId?: string } {
  if (!wf.nodes?.length) return { ok: false, message: "A workflow needs at least one node." }
  const L = layoutWorkflow(wf)
  const nodes = conv(convId)?.canvas.nodes ?? []
  const pos = placeNewRow(nodes, L.width, L.height)
  const frame: FrameNode = {
    id: uid("f_"),
    kind: "frame",
    type: "workflow",
    ...pos,
    w: L.width,
    h: L.height,
    title: wf.title.slice(0, 60),
    workflow: wf,
    source: "agent",
    changeSummary: wf.description,
    createdAt: Date.now(),
  }
  useStore.getState().editCanvas((d) => ({ ...d, nodes: [...d.nodes, frame] }), { convId })
  useStore.getState().focusNode(frame.id)
  return {
    ok: true,
    frameId: frame.id,
    message: `Created workflow "${wf.title}" (id ${frame.id}) with ${wf.nodes.length} steps.`,
    log: { id: uid(), label: `Workflow: ${frame.title}`, targetId: frame.id, tone: "create" },
  }
}
