import type { ActionLog, FrameNode, Mark, NoteNode, Device, PrototypeScreen } from "./types"
import { frameLabel, placeNewRow, placeNextVersion, findFreeSpot, uid, useStore } from "./store"
import { checkPrototype, DEVICE_SIZES, normalizeScreens, sanitizeWireframe, screenSlug } from "./wireframe"
import { hasFigmaAccess, postComment } from "./figma"
import { allDesignSystems } from "./design-systems"

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

/** Frame size for a device; mobile follows the design system's viewport when it defines one. */
function frameSize(convId: string, device: Device) {
  if (device !== "mobile") return DEVICE_SIZES[device]
  const ds = allDesignSystems(useStore.getState().designSystems).find((d) => d.id === dsIdFor(convId))
  return ds?.viewport ?? DEVICE_SIZES.mobile
}

export type ActionResult = { ok: boolean; message: string; log?: ActionLog }

export function createWireframe(convId: string, input: { title: string; html: string; device?: Device; summary?: string; height?: number }): ActionResult {
  const device = input.device ?? "mobile"
  const size = frameSize(convId, device)
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

// ───────── prototypes ─────────
// create_prototype / iterate_prototype set up the frame and plan; the screens then arrive one by one, either streamed
// as <screen> blocks in the reply (see screen-stream.ts) or, as a fallback, through add_prototype_screens.

type ScreenInput = { id?: string; title: string; html: string }
type PlanInput = { id: string; title: string }[]

/** Replace screens with the same id, append new ones. */
function mergeScreens(base: PrototypeScreen[], incoming: PrototypeScreen[]) {
  const out = [...base]
  for (const s of incoming) {
    const i = out.findIndex((x) => x.id === s.id)
    if (i >= 0) out[i] = s
    else out.push(s)
  }
  return out
}

function normalizePlan(plan: PlanInput | undefined, screens: PrototypeScreen[]) {
  const list = (plan ?? []).map((p) => ({ id: screenSlug(p.id || p.title), title: p.title.slice(0, 60) }))
  // Built screens are always part of the plan, in plan order first.
  for (const s of screens) if (!list.some((p) => p.id === s.id)) list.push({ id: s.id, title: s.title })
  return list
}

/** What the agent is told after each call: what's built, what's still to build, and any broken links. */
function prototypeReport(f: FrameNode) {
  const screens = f.screens ?? []
  const planned = f.plannedScreens ?? []
  const todo = planned.filter((p) => !screens.some((s) => s.id === p.id))
  if (!screens.length) return `Planned ${planned.length} screens: ${screenList(planned)}. Now write each of them as a <screen id="…" title="…">…</screen> block in your reply.`
  const { broken, unreachable } = checkPrototype(screens, f.startScreen ?? "", planned.map((p) => p.id))
  return [
    `Built ${screens.length}${planned.length > screens.length ? ` of ${planned.length}` : ""} screens: ${screenList(screens)}. Starts on ${f.startScreen}.`,
    todo.length ? `Still to build: ${screenList(todo)}. Write them next as <screen id="…" title="…">…</screen> blocks in your reply.` : "",
    broken.length ? `Broken links: ${broken.join("; ")}. Fix them by writing those screens again as <screen> blocks with the same ids.` : "",
    !todo.length && unreachable.length ? `Nothing links to: ${unreachable.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ")
}

const screenList = (screens: { id: string; title: string }[]) => screens.map((s) => `${s.id} (${s.title})`).join(", ")

/** Screens in plan order (the order the flow reads in), unplanned ones last; also picks the start screen. */
function withStart(frame: FrameNode, start?: string): FrameNode {
  const order = new Map((frame.plannedScreens ?? []).map((p, i) => [p.id, i]))
  const screens = [...(frame.screens ?? [])].sort((a, b) => (order.get(a.id) ?? 1e3) - (order.get(b.id) ?? 1e3))
  frame = { ...frame, screens }
  const id = (start && screens.find((s) => s.id === screenSlug(start) || s.id === start)?.id) || (frame.startScreen && screens.some((s) => s.id === frame.startScreen) ? frame.startScreen : screens[0]?.id)
  return { ...frame, startScreen: id, html: screens.find((s) => s.id === id)?.html ?? "" }
}

/** A new prototype: the plan for the whole flow and its first screens. */
export function createPrototype(convId: string, input: { title: string; screens?: ScreenInput[]; plan?: PlanInput; start?: string; device?: Device; summary?: string }): ActionResult & { frameId?: string } {
  if (!input.screens?.length && !input.plan?.length) return { ok: false, message: "Give the plan (every screen id and title), then write the screens as <screen> blocks." }
  const known = (input.plan ?? []).map((p) => screenSlug(p.id || p.title))
  const { screens } = normalizeScreens(input.screens ?? [], known)
  const device = input.device ?? "mobile"
  const size = frameSize(convId, device)
  const nodes = conv(convId)?.canvas.nodes ?? []
  const frame = withStart(
    {
      id: uid("f_"),
      kind: "frame",
      type: "wireframe",
      ...placeNewRow(nodes, size.w, size.h),
      w: size.w,
      h: size.h,
      title: input.title.slice(0, 60),
      screens,
      plannedScreens: normalizePlan(input.plan, screens),
      device,
      source: "agent",
      designSystemId: dsIdFor(convId),
      lineageId: uid("l_"),
      version: 1,
      changeSummary: input.summary,
      createdAt: Date.now(),
    },
    input.start,
  )
  useStore.getState().editCanvas((d) => ({ ...d, nodes: [...d.nodes, frame] }), { convId })
  useStore.getState().focusNode(frame.id)
  return {
    ok: true,
    frameId: frame.id,
    message: `Created prototype ${frameLabel(frame)} (id ${frame.id}). ${prototypeReport(frame)}`,
    log: { id: uid(), label: `Prototype: ${frame.title}`, targetId: frame.id, tone: "create" },
  }
}

/** Add or replace screens in a prototype that's being built in this turn. */
export function addPrototypeScreens(convId: string, input: { frame_id: string; screens?: ScreenInput[]; start?: string }, building: Set<string>): ActionResult {
  const src = findFrame(convId, input.frame_id)
  if (!src?.screens) return { ok: false, message: `No prototype with id ${input.frame_id}.` }
  if (!building.has(src.id)) return { ok: false, message: `Prototype ${src.id} is finished; use iterate_prototype to make its next version.` }
  if (!input.screens?.length) return { ok: false, message: "Send at least one screen." }
  const known = [...src.screens.map((s) => s.id), ...(src.plannedScreens ?? []).map((p) => p.id)]
  const { screens } = normalizeScreens(input.screens ?? [], known)
  const merged = mergeScreens(src.screens, screens)
  const frame = withStart({ ...src, screens: merged, plannedScreens: normalizePlan(src.plannedScreens, merged) }, input.start)
  useStore.getState().editCanvas((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === frame.id ? frame : n)) }), { convId, record: false })
  return { ok: true, message: `Added ${screenList(screens)} to ${frameLabel(frame)}. ${prototypeReport(frame)}` }
}

/**
 * The next version of a prototype (or a wireframe turned into one), beside the source.
 * Unchanged screens carry over; the new or changed ones follow as streamed <screen> blocks.
 */
export function iteratePrototype(
  convId: string,
  input: { source_frame_id: string; change_summary: string; screens?: ScreenInput[]; remove?: string[]; plan?: PlanInput; start?: string; title?: string; device?: Device },
): ActionResult & { frameId?: string } {
  const src = findFrame(convId, input.source_frame_id)
  if (!src) return { ok: false, message: `No frame with id ${input.source_frame_id}. Use create_prototype for a new flow.` }
  const nodes = conv(convId)!.canvas.nodes
  const lineageId = src.lineageId ?? uid("l_")
  const lineage = nodes.filter((n): n is FrameNode => n.kind === "frame" && n.lineageId === lineageId)
  const version = src.lineageId ? Math.max(...lineage.map((f) => f.version ?? 1)) + 1 : 2
  const removed = new Set((input.remove ?? []).map(screenSlug))
  // A plain wireframe becomes the first screen of the new prototype.
  const base = (src.screens ?? (src.type === "wireframe" && src.html ? [{ id: screenSlug(src.title), title: src.title, html: src.html }] : [])).filter((s) => !removed.has(s.id))
  const known = [...base.map((s) => s.id), ...(input.plan ?? src.plannedScreens ?? []).map((p) => screenSlug(p.id || p.title))]
  const { screens } = normalizeScreens(input.screens ?? [], known)
  const merged = mergeScreens(base, screens)
  if (!merged.length) return { ok: false, message: "The new version would have no screens." }
  const device = input.device ?? src.device ?? "mobile"
  const size = frameSize(convId, device)
  const pos = src.lineageId ? placeNextVersion(nodes, lineageId, size.w, size.h) : findFreeSpot(nodes, { x: src.x + src.w + 120, y: src.y, w: size.w, h: size.h }, "right")
  const plan = normalizePlan((input.plan ?? src.plannedScreens)?.filter((p) => !removed.has(screenSlug(p.id || p.title))), merged)
  const frame = withStart(
    {
      id: uid("f_"),
      kind: "frame",
      type: "wireframe",
      ...pos,
      w: size.w,
      h: size.h,
      title: (input.title ?? src.title).slice(0, 60),
      screens: merged,
      plannedScreens: plan,
      startScreen: src.startScreen,
      device,
      source: "agent",
      designSystemId: dsIdFor(convId),
      lineageId,
      version,
      parentId: src.id,
      changeSummary: input.change_summary,
      createdAt: Date.now(),
    },
    input.start,
  )
  const patchSrc = src.lineageId ? null : { ...src, lineageId, version: 1 }
  useStore.getState().editCanvas((d) => ({ ...d, nodes: [...d.nodes.map((n) => (patchSrc && n.id === patchSrc.id ? patchSrc : n)), frame] }), { convId })
  useStore.getState().focusNode(frame.id)
  return {
    ok: true,
    frameId: frame.id,
    message: `Created prototype ${frameLabel(frame)} (id ${frame.id}) next to ${frameLabel(src)}, which is unchanged. ${prototypeReport(frame)}`,
    log: { id: uid(), label: `Prototype: ${frame.title} · V${version}`, targetId: frame.id, tone: "create" },
  }
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
  const size = frameSize(convId, device)
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
  // The agent's notes are documents: a compact card on the canvas, read in full in the notes reader.
  const lines = input.text.split("\n").length
  const w = author === "agent" ? 300 : 260
  const h = author === "agent" ? 156 : Math.min(420, 70 + lines * 20 + Math.ceil(input.text.length / 34) * 6)
  const pos = near
    ? findFreeSpot(c.canvas.nodes, { x: near.x + near.w + 40, y: near.y, w, h })
    : placeNewRow(c.canvas.nodes, w, h)
  const note: NoteNode = { id: uid("n_"), kind: "note", ...pos, w, h, title: input.title, text: input.text, author, createdAt: Date.now() }
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
