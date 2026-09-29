import { create } from "zustand"
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware"
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval"
import { nanoid } from "nanoid"
import type {
  CanvasDoc,
  CanvasNode,
  ChatMessage,
  Conversation,
  FrameNode,
  Mark,
  Mode,
  NoteNode,
  Page,
  DesignSystem,
  Connector,
  ProductLibrary,
  ProviderId,
  ProviderKeyState,
  Settings,
  Viewport,
} from "./types"
import { DEVICE_SIZES, EXAMPLE_WIREFRAMES } from "./wireframe"

export const uid = (p = "") => p + nanoid(7)

// ───────── storage: IndexedDB with an in-memory fallback (private windows, sandboxes) ─────────
// Writes are debounced: the persisted state holds every screenshot as a data URL, so serialising
// it on each store update (every streamed token) exhausts memory and crashes the tab.
const memory = new Map<string, string>()
const WRITE_DELAY = 800
const pending = new Map<string, unknown>()
let writeTimer = 0

function flushWrites() {
  clearTimeout(writeTimer)
  writeTimer = 0
  for (const [k, v] of pending) {
    const text = JSON.stringify(v)
    memory.set(k, text)
    idbSet(k, text).catch(() => {
      /* stay in memory */
    })
  }
  pending.clear()
}

/** Drop queued writes, e.g. before clearing storage and reloading. */
export function discardPendingWrites() {
  clearTimeout(writeTimer)
  writeTimer = 0
  pending.clear()
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushWrites)
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushWrites())
}

const safeStorage: PersistStorage<unknown> = {
  getItem: async (k) => {
    let text: string | null
    try {
      text = ((await idbGet(k)) as string | undefined) ?? memory.get(k) ?? null
    } catch {
      text = memory.get(k) ?? null
    }
    return text ? (JSON.parse(text) as StorageValue<unknown>) : null
  },
  setItem: (k, v) => {
    pending.set(k, v)
    if (!writeTimer) writeTimer = window.setTimeout(flushWrites, WRITE_DELAY)
  },
  removeItem: async (k) => {
    pending.delete(k)
    memory.delete(k)
    try {
      await idbDel(k)
    } catch {
      /* ignore */
    }
  },
}

// ───────── defaults ─────────
const emptyProvider = (extra: Partial<ProviderKeyState> = {}): ProviderKeyState => ({
  apiKey: "",
  status: "empty",
  models: [],
  ...extra,
})

export const defaultSettings: Settings = {
  providers: {
    anthropic: emptyProvider(),
    openai: emptyProvider(),
    google: emptyProvider(),
    openrouter: emptyProvider(),
    custom: emptyProvider({ baseUrl: "", label: "Custom" }),
  },
  figmaToken: "",
  selectedModel: { provider: "demo", id: "demo", name: "Demo agent (offline)" },
  speakReplies: false,
  theme: "system",
  profileName: "Aksh",
}

export const emptyCanvas = (): CanvasDoc => ({ nodes: [], marks: [], viewport: { x: 80, y: 80, zoom: 0.6 } })

function exampleConversation(): Conversation {
  const now = Date.now()
  const lineageId = uid("l_")
  const { w, h } = DEVICE_SIZES.mobile
  const v1: FrameNode = {
    id: "f_example1",
    kind: "frame",
    type: "wireframe",
    x: 0,
    y: 0,
    w,
    h,
    title: EXAMPLE_WIREFRAMES[0].title,
    html: EXAMPLE_WIREFRAMES[0].html,
    device: "mobile",
    source: "agent",
    lineageId,
    version: 1,
    changeSummary: EXAMPLE_WIREFRAMES[0].summary,
    createdAt: now - 60_000,
  }
  const v2: FrameNode = {
    ...v1,
    id: "f_example2",
    x: w + 120,
    html: EXAMPLE_WIREFRAMES[1].html,
    version: 2,
    parentId: v1.id,
    changeSummary: EXAMPLE_WIREFRAMES[1].summary,
    createdAt: now - 30_000,
  }
  const marks: Mark[] = [
    { id: uid("m_"), frameId: v1.id, type: "annotation", x: 0.04, y: 0.5, w: 0.92, h: 0.2, text: "Eight identical time chips with no grouping. People scan for a sitting (early or late), not a list of clock times.", severity: "major", author: "agent", n: 1, createdAt: now },
    { id: uid("m_"), frameId: v1.id, type: "annotation", x: 0.04, y: 0.895, w: 0.92, h: 0.075, text: "'Continue' hides the commitment. Say what happens: 'Reserve 6:15 pm'.", severity: "minor", author: "agent", n: 2, createdAt: now },
    { id: uid("m_"), frameId: v1.id, type: "comment", x: 0.5, y: 0.815, text: "The partner disclaimer is the only place the booking provider shows up. Surface it with the cancellation policy instead.", severity: "minor", author: "agent", n: 3, createdAt: now },
  ]
  const note: NoteNode = {
    id: uid("n_"),
    kind: "note",
    x: 2 * (w + 120),
    y: 0,
    w: 260,
    h: 190,
    title: "V1 → V2",
    text: "• Group times by sitting and show scarcity\n• Seating preference before commit\n• CTA names the slot\n\nNext: test a one-tap 'best match' variant for repeat diners.",
    author: "agent",
    createdAt: now,
  }
  const messages: ChatMessage[] = [
    {
      id: uid("c_"),
      role: "user",
      text: "Wireframe the reserve-a-table step for Stella, then critique it.",
      createdAt: now - 70_000,
      status: "done",
      attachments: [{ kind: "product", title: "Context file" }],
    },
    {
      id: uid("c_"),
      role: "assistant",
      text: "I put a baseline on the canvas as **V1** and marked it up. The biggest issue is the time grid: eight identical chips with no grouping, so people scan for a sitting rather than read clock times.",
      parts: [
        {
          type: "plan",
          id: "plan_example",
          title: "Wireframe and critique",
          items: [
            { id: "t0", title: "Pull constraints from the Context file", status: "completed" },
            { id: "t1", title: "Draft the reserve step as V1", status: "completed" },
            { id: "t2", title: "Mark up the riskiest parts", status: "completed" },
          ],
        },
        { type: "text", id: "p_example1", text: "I put a baseline on the canvas as **V1** and marked it up. The biggest issue is the time grid: eight identical chips with no grouping, so people scan for a sitting rather than read clock times." },
      ],
      createdAt: now - 60_000,
      status: "done",
      model: "Demo agent (offline)",
      actions: [
        { id: uid(), label: "Created Reserve a table · V1", targetId: v1.id, tone: "create" },
        { id: uid(), label: "3 marks on V1", targetId: v1.id, tone: "mark" },
      ],
    },
    { id: uid("c_"), role: "user", text: "Iterate on it.", createdAt: now - 40_000, status: "done", attachments: [{ kind: "frame", frameId: v1.id, title: "Reserve a table · V1" }] },
    {
      id: uid("c_"),
      role: "assistant",
      text: "Added **V2** next to V1 and left V1 untouched. Times are grouped by sitting with scarcity cues, seating is chosen before commit, and the CTA names the slot.",
      createdAt: now - 30_000,
      status: "done",
      model: "Demo agent (offline)",
      actions: [
        { id: uid(), label: "Created Reserve a table · V2", targetId: v2.id, tone: "create" },
        { id: uid(), label: "Note: V1 → V2", targetId: note.id, tone: "note" },
      ],
    },
  ]
  return {
    id: "conv_example",
    title: "Reservation flow crit",
    createdAt: now - 70_000,
    updatedAt: now - 30_000,
    messages,
    canvas: { nodes: [v1, v2, note], marks, viewport: { x: 60, y: 70, zoom: 0.62 } },
    example: true,
  }
}

const defaultProduct: ProductLibrary = {
  about: "A flow for booking a reservation on the restaurant dine-out page of a food delivery app.",
  audience: "Existing delivery customers who want to eat in, often deciding same day, on mobile.",
  goals: "Increase completed reservations from the restaurant page; keep the booking partner invisible but trustworthy.",
  constraints: "Availability comes from a white-labelled booking partner. Native iOS and Android.",
  voice: "Short, confident, friendly. Sentence case.",
  screens: [],
  designSystem: { source: "screens", status: "idle" },
  useInConversations: true,
  brief: "",
  docs: [],
}

// ───────── placement helpers ─────────
const GAP = 120

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w + 40 && a.x + a.w + 40 > b.x && a.y < b.y + b.h + 40 && a.y + a.h + 40 > b.y
}

export function findFreeSpot(nodes: CanvasNode[], box: { x: number; y: number; w: number; h: number }, direction: "down" | "right" = "down") {
  const b = { ...box }
  let guard = 0
  let hit: CanvasNode | undefined
  while ((hit = nodes.find((n) => overlaps(b, n))) && guard++ < 50) {
    if (direction === "right") b.x = hit.x + hit.w + 80
    else b.y = hit.y + hit.h + 80
  }
  return { x: b.x, y: b.y }
}

/** New lineage or upload: start a new row under everything that exists. */
export function placeNewRow(nodes: CanvasNode[], w: number, h: number) {
  if (!nodes.length) return { x: 0, y: 0 }
  const minX = Math.min(...nodes.map((n) => n.x))
  const maxBottom = Math.max(...nodes.map((n) => n.y + n.h))
  return findFreeSpot(nodes, { x: minX, y: maxBottom + GAP + 40, w, h })
}

/** Iteration: to the right of the last version in the same lineage. */
export function placeNextVersion(nodes: CanvasNode[], lineageId: string, w: number, h: number) {
  const lineage = nodes.filter((n): n is FrameNode => n.kind === "frame" && n.lineageId === lineageId)
  const rightmost = lineage.reduce((a, b) => (b.x + b.w > a.x + a.w ? b : a), lineage[0])
  return findFreeSpot(nodes, { x: rightmost.x + rightmost.w + GAP, y: rightmost.y, w, h }, "right")
}

/** Place several images in a row after existing content. */
export function placeRow(nodes: CanvasNode[], sizes: { w: number; h: number }[]) {
  const start = placeNewRow(nodes, sizes[0]?.w ?? 400, Math.max(...sizes.map((s) => s.h), 1))
  let x = start.x
  return sizes.map((s) => {
    const p = { x, y: start.y }
    x += s.w + 80
    return p
  })
}

// ───────── store ─────────
type History = { past: CanvasDoc[]; future: CanvasDoc[] }
export type Tool = "select" | "hand" | "note" | "comment"

interface State {
  hydrated: boolean
  route: Page
  setRoute: (p: Page) => void
  openProject: (id: string, mode?: Mode) => void
  designSystems: DesignSystem[]
  defaultDesignSystemId: string
  upsertDesignSystem: (ds: DesignSystem) => void
  deleteDesignSystem: (id: string) => void
  setDefaultDesignSystem: (id: string) => void
  connectors: Connector[]
  upsertConnector: (c: Connector) => void
  patchConnector: (id: string, patch: Partial<Connector>) => void
  deleteConnector: (id: string) => void
  mode: Mode
  conversations: Conversation[]
  activeId: string
  selection: string[]
  tool: Tool
  settings: Settings
  product: ProductLibrary
  history: Record<string, History>
  focus: { id: string; t: number } | null
  settingsOpen: boolean
  busy: boolean

  setMode: (m: Mode) => void
  setTool: (t: Tool) => void
  setSettingsOpen: (o: boolean) => void
  setBusy: (b: boolean) => void
  newConversation: () => string
  setActive: (id: string) => void
  renameConversation: (id: string, title: string) => void
  deleteConversation: (id: string) => void
  updateConversation: (id: string, fn: (c: Conversation) => Conversation) => void

  /** Every canvas change goes through here so it can be undone. */
  editCanvas: (fn: (doc: CanvasDoc) => CanvasDoc, opts?: { convId?: string; record?: boolean }) => void
  setViewport: (v: Viewport) => void
  undo: () => void
  redo: () => void
  select: (ids: string[]) => void
  focusNode: (id: string) => void

  addMessage: (m: ChatMessage, convId?: string) => void
  patchMessage: (id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>), convId?: string) => void

  patchSettings: (patch: Partial<Settings>) => void
  patchProvider: (id: Exclude<ProviderId, "demo">, patch: Partial<ProviderKeyState>) => void
  patchProduct: (patch: Partial<ProductLibrary> | ((p: ProductLibrary) => Partial<ProductLibrary>)) => void
}

const example = exampleConversation()

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      route: "home",
      setRoute: (route) => set({ route, selection: [] }),
      openProject: (id, mode = "canvas") => set({ activeId: id, route: "project", mode, selection: [] }),
      designSystems: [],
      defaultDesignSystemId: "ds_wireframe",
      upsertDesignSystem: (ds) =>
        set((s) => ({ designSystems: s.designSystems.some((d) => d.id === ds.id) ? s.designSystems.map((d) => (d.id === ds.id ? ds : d)) : [...s.designSystems, ds] })),
      deleteDesignSystem: (id) =>
        set((s) => ({
          designSystems: s.designSystems.filter((d) => d.id !== id),
          defaultDesignSystemId: s.defaultDesignSystemId === id ? "ds_wireframe" : s.defaultDesignSystemId,
        })),
      setDefaultDesignSystem: (defaultDesignSystemId) => set({ defaultDesignSystemId }),
      connectors: [],
      upsertConnector: (c) => set((s) => ({ connectors: s.connectors.some((x) => x.id === c.id) ? s.connectors.map((x) => (x.id === c.id ? c : x)) : [...s.connectors, c] })),
      patchConnector: (id, patch) => set((s) => ({ connectors: s.connectors.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteConnector: (id) => set((s) => ({ connectors: s.connectors.filter((x) => x.id !== id) })),
      mode: "canvas",
      conversations: [example],
      activeId: example.id,
      selection: [],
      tool: "select",
      settings: defaultSettings,
      product: defaultProduct,
      history: {},
      focus: null,
      settingsOpen: false,
      busy: false,

      setMode: (mode) => set({ mode }),
      setTool: (tool) => set({ tool }),
      setSettingsOpen: (open) => open && set({ route: "settings" }),
      setBusy: (busy) => set({ busy }),

      newConversation: () => {
        const id = uid("conv_")
        const c: Conversation = { id, title: "New conversation", createdAt: Date.now(), updatedAt: Date.now(), messages: [], canvas: emptyCanvas(), designSystemId: get().defaultDesignSystemId }
        set((s) => ({ conversations: [c, ...s.conversations], activeId: id, selection: [], mode: "canvas", route: "project" }))
        return id
      },
      setActive: (id) => set({ activeId: id, selection: [], route: "project" }),
      renameConversation: (id, title) => get().updateConversation(id, (c) => ({ ...c, title })),
      deleteConversation: (id) =>
        set((s) => {
          const rest = s.conversations.filter((c) => c.id !== id)
          if (!rest.length) {
            const c: Conversation = { id: uid("conv_"), title: "New conversation", createdAt: Date.now(), updatedAt: Date.now(), messages: [], canvas: emptyCanvas() }
            return { conversations: [c], activeId: c.id, selection: [], route: s.route === "project" ? "home" : s.route }
          }
          return { conversations: rest, activeId: s.activeId === id ? rest[0].id : s.activeId, selection: [], route: s.route === "project" && s.activeId === id ? "home" : s.route }
        }),
      updateConversation: (id, fn) =>
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? fn(c) : c)) })),

      editCanvas: (fn, opts = {}) => {
        const convId = opts.convId ?? get().activeId
        const conv = get().conversations.find((c) => c.id === convId)
        if (!conv) return
        const prev = conv.canvas
        const next = fn(prev)
        if (next === prev) return
        set((s) => {
          const h = s.history[convId] ?? { past: [], future: [] }
          return {
            conversations: s.conversations.map((c) => (c.id === convId ? { ...c, canvas: next, updatedAt: Date.now() } : c)),
            history:
              opts.record === false
                ? s.history
                : { ...s.history, [convId]: { past: [...h.past.slice(-49), prev], future: [] } },
          }
        })
      },
      setViewport: (viewport) => {
        const id = get().activeId
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, canvas: { ...c.canvas, viewport } } : c)) }))
      },
      undo: () => {
        const id = get().activeId
        const h = get().history[id]
        const conv = get().conversations.find((c) => c.id === id)
        if (!h?.past.length || !conv) return
        const prev = h.past[h.past.length - 1]
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, canvas: { ...prev, viewport: c.canvas.viewport } } : c)),
          history: { ...s.history, [id]: { past: h.past.slice(0, -1), future: [conv.canvas, ...h.future] } },
          selection: [],
        }))
      },
      redo: () => {
        const id = get().activeId
        const h = get().history[id]
        const conv = get().conversations.find((c) => c.id === id)
        if (!h?.future.length || !conv) return
        const next = h.future[0]
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, canvas: { ...next, viewport: c.canvas.viewport } } : c)),
          history: { ...s.history, [id]: { past: [...h.past, conv.canvas], future: h.future.slice(1) } },
        }))
      },
      select: (selection) => set({ selection }),
      focusNode: (id) => set({ focus: { id, t: Date.now() }, mode: "canvas" }),

      addMessage: (m, convId) => {
        const id = convId ?? get().activeId
        get().updateConversation(id, (c) => {
          const title =
            c.title === "New conversation" && m.role === "user" && m.text.trim()
              ? m.text.trim().replace(/\s+/g, " ").slice(0, 48)
              : c.title
          return { ...c, title, messages: [...c.messages, m], updatedAt: Date.now() }
        })
      },
      patchMessage: (mid, patch, convId) => {
        const id = convId ?? get().activeId
        get().updateConversation(id, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === mid ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)),
        }))
      },

      patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      patchProvider: (id, patch) =>
        set((s) => ({
          settings: { ...s.settings, providers: { ...s.settings.providers, [id]: { ...s.settings.providers[id], ...patch } } },
        })),
      patchProduct: (patch) =>
        set((s) => ({ product: { ...s.product, ...(typeof patch === "function" ? patch(s.product) : patch) } })),
    }),
    {
      name: "design-agent-studio",
      version: 1,
      storage: safeStorage as PersistStorage<Partial<State>>,
      partialize: (s) => ({
        conversations: s.conversations,
        activeId: s.activeId,
        settings: s.settings,
        product: s.product,
        route: s.route,
        designSystems: s.designSystems,
        defaultDesignSystemId: s.defaultDesignSystemId,
        connectors: s.connectors.map((c) => ({ ...c, status: c.status === "checking" ? ("untested" as const) : c.status })),
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...(p.settings ?? {}),
            providers: { ...current.settings.providers, ...(p.settings?.providers ?? {}) },
          },
          product: { ...current.product, ...(p.product ?? {}) },
          mode: "canvas",
          // never restore a half-finished stream
          conversations: (p.conversations ?? current.conversations).map((c) => ({
            ...c,
            messages: c.messages.map((m) => ({
              ...m,
              status: m.status === "streaming" ? ("done" as const) : m.status,
              activity: undefined,
              parts: m.parts?.map((pt) =>
                pt.type === "ask" && (pt.status === "pending" || pt.status === "submitting")
                  ? { ...pt, status: "rejected" as const, result: "Expired when the page reloaded." }
                  : pt,
              ),
            })),
          })),
        }
      },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
)

// convenience selectors
export const useActiveConversation = () => useStore((s) => s.conversations.find((c) => c.id === s.activeId) ?? s.conversations[0])

export function getActive() {
  const s = useStore.getState()
  return s.conversations.find((c) => c.id === s.activeId) ?? s.conversations[0]
}

export function frameLabel(f: FrameNode) {
  return f.version ? `${f.title} · V${f.version}` : f.title
}
