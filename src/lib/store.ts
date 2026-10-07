import { create } from "zustand"
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware"
import { get as idbGet, getMany as idbGetMany, set as idbSet, del as idbDel, keys as idbKeys } from "idb-keyval"
import { nanoid } from "nanoid"
import type {
  CanvasDoc,
  CanvasNode,
  ChatMessage,
  Conversation,
  FrameNode,
  Mode,
  Page,
  DesignSystem,
  DesignEdits,
  Connector,
  ProductLibrary,
  ProviderId,
  ProviderKeyState,
  Settings,
  Viewport,
} from "./types"
import { DEFAULT_DESIGN_SYSTEM_ID } from "./design-systems"

export const uid = (p = "") => p + nanoid(7)

// ───────── storage: IndexedDB with an in-memory fallback (private windows, sandboxes) ─────────
// The state holds every screenshot as a data URL. Serialising all of it on each save froze the
// canvas (a save follows every pan, drag and streamed reply), so large data URLs are stored once
// under their own keys and the saved state only carries a short reference to them.
// Writes are also debounced, so streaming doesn't save on every token.
const memory = new Map<string, string>()
const WRITE_DELAY = 800
const pending = new Map<string, unknown>()
let writeTimer = 0

const BLOB_PREFIX = "das:blob:"
const REF = "\u0000blob:" // can't occur in real data
const BIG = 16 * 1024
/** data URL → blob key. Map lookups on a string we've seen before are cheap, so each image is written once. */
const blobKeys = new Map<string, string>()
const memoryBlobs = new Map<string, string>()
let liveBlobs = new Set<string>()

function stashBlob(src: string): string {
  let key = blobKeys.get(src)
  if (!key) {
    key = BLOB_PREFIX + nanoid(12)
    blobKeys.set(src, key)
    memoryBlobs.set(key, src)
    idbSet(key, src).catch(() => {
      /* stays in memoryBlobs */
    })
  }
  return key
}

/** Copy of a JSON value with large data URLs swapped for blob references. Cost scales with the number of values, not their size. */
function dehydrate(v: unknown, used: Set<string>): unknown {
  if (typeof v === "string") {
    if (v.length > BIG && v.startsWith("data:")) {
      const key = stashBlob(v)
      used.add(key)
      return REF + key
    }
    return v
  }
  if (Array.isArray(v)) return v.map((x) => dehydrate(x, used))
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {}
    for (const k in v) {
      const x = (v as Record<string, unknown>)[k]
      if (x !== undefined && typeof x !== "function") out[k] = dehydrate(x, used)
    }
    return out
  }
  return v
}

function flushWrites() {
  clearTimeout(writeTimer)
  writeTimer = 0
  for (const [k, v] of pending) {
    const used = new Set<string>()
    const text = JSON.stringify(dehydrate(v, used))
    memory.set(k, text)
    idbSet(k, text)
      .then(() => {
        // Images no longer referenced (deleted frames, cleared screens) are removed after the state that drops them is saved.
        for (const key of liveBlobs) if (!used.has(key)) dropBlob(key)
        liveBlobs = used
      })
      .catch(() => {
        /* stay in memory */
      })
  }
  pending.clear()
}

function dropBlob(key: string) {
  const src = memoryBlobs.get(key)
  if (src !== undefined) blobKeys.delete(src)
  memoryBlobs.delete(key)
  idbDel(key).catch(() => {})
}

/** Read the saved state and put the images back. Also reads the older format, which kept everything inline. */
async function readState(k: string): Promise<StorageValue<unknown> | null> {
  let text: string | null
  try {
    text = ((await idbGet(k)) as string | undefined) ?? memory.get(k) ?? null
  } catch {
    text = memory.get(k) ?? null
  }
  if (!text) return null
  const refs = new Set<string>()
  const parsed = JSON.parse(text, (_key, value) => {
    if (typeof value === "string" && value.startsWith(REF)) refs.add(value.slice(REF.length))
    return value
  })
  // Images written by a session that closed before its state was saved are never referenced; clear them out.
  idbKeys()
    .then((all) => all.forEach((key) => typeof key === "string" && key.startsWith(BLOB_PREFIX) && !refs.has(key) && !memoryBlobs.has(key) && idbDel(key).catch(() => {})))
    .catch(() => {})
  if (!refs.size) return parsed as StorageValue<unknown>
  const keys = [...refs]
  let values: (string | undefined)[] = []
  try {
    values = (await idbGetMany(keys)) as (string | undefined)[]
  } catch {
    /* fall back to memory below */
  }
  const found = new Map<string, string>()
  keys.forEach((key, i) => {
    const src = values[i] ?? memoryBlobs.get(key)
    if (src === undefined) return
    found.set(key, src)
    blobKeys.set(src, key)
    memoryBlobs.set(key, src)
  })
  liveBlobs = new Set(found.keys())
  const restore = (v: unknown): unknown => {
    if (typeof v === "string") return v.startsWith(REF) ? (found.get(v.slice(REF.length)) ?? "") : v
    if (Array.isArray(v)) return v.map(restore)
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>
      for (const key in o) o[key] = restore(o[key])
      return o
    }
    return v
  }
  return restore(parsed) as StorageValue<unknown>
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
  getItem: readState,
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
    moonshot: emptyProvider(),
    custom: emptyProvider({ baseUrl: "", label: "Custom" }),
  },
  figmaToken: "",
  selectedModel: { provider: "anthropic", id: "", name: "No model selected" },
  speakReplies: false,
  theme: "system",
  profileName: "Aksh",
}

export const emptyCanvas = (): CanvasDoc => ({ nodes: [], marks: [], viewport: { x: 80, y: 80, zoom: 0.6 } })

const defaultProduct: ProductLibrary = {
  about: "",
  audience: "",
  goals: "",
  constraints: "",
  voice: "",
  screens: [],
  designSystem: { source: "screens", status: "idle" },
  useInConversations: true,
  brief: "",
  docs: [],
}

// Earlier versions seeded a sample project and a sample Context file. They leaked into every
// real model's prompt, so migration 1 → 2 removes them from browsers that saved them.
const LEGACY_SAMPLE_PRODUCT: Partial<Record<keyof ProductLibrary, string>> = {
  about: "A flow for booking a reservation on the restaurant dine-out page of a food delivery app.",
  audience: "Existing delivery customers who want to eat in, often deciding same day, on mobile.",
  goals: "Increase completed reservations from the restaurant page; keep the booking partner invisible but trustworthy.",
  constraints: "Availability comes from a white-labelled booking partner. Native iOS and Android.",
  voice: "Short, confident, friendly. Sentence case.",
}

function migrate(persisted: unknown, version: number) {
  const p = (persisted ?? {}) as Record<string, unknown> & Partial<State>
  if (version < 2) {
    const convs = ((p.conversations ?? []) as (Conversation & { example?: boolean })[]).filter((c) => !c.example && c.id !== "conv_example")
    // Drop the offline demo agent's replies and everything they put on the canvas: the canvas is
    // sent to real models, so its sample wireframes would keep steering them.
    p.conversations = convs.map(({ example: _example, ...c }) => {
      const demo = c.messages.filter((m) => m.role === "assistant" && m.model === "Demo agent (offline)")
      if (!demo.length) return c
      const drop = new Set(demo.flatMap((m) => (m.actions ?? []).map((a) => a.targetId)).filter((id): id is string => !!id))
      for (const m of demo) for (const pt of m.parts ?? []) if (pt.type === "workflow") drop.add(pt.frameId)
      const demoIds = new Set(demo.map((m) => m.id))
      // Only remove what the agent created; the designer's own screenshots just lose the agent's marks.
      const agentMade = new Set(c.canvas.nodes.filter((n) => drop.has(n.id) && (n.kind === "note" ? n.author === "agent" : n.source === "agent")).map((n) => n.id))
      return {
        ...c,
        messages: c.messages.filter((m) => !demoIds.has(m.id)),
        canvas: {
          ...c.canvas,
          nodes: c.canvas.nodes.filter((n) => !agentMade.has(n.id)),
          marks: c.canvas.marks.filter((m) => !agentMade.has(m.frameId) && !(drop.has(m.frameId) && m.author === "agent")),
        },
      }
    })
    if (!convs.some((c) => c.id === p.activeId)) {
      p.activeId = convs[0]?.id ?? ""
      if (p.route === "project" && !convs.length) p.route = "home"
    }
    if (p.product) {
      const product = { ...p.product }
      for (const [k, v] of Object.entries(LEGACY_SAMPLE_PRODUCT)) if ((product as Record<string, unknown>)[k] === v) (product as Record<string, unknown>)[k] = ""
      p.product = product
    }
    const sel = p.settings?.selectedModel as { provider: string } | undefined
    if (p.settings && sel?.provider === "demo") p.settings = { ...p.settings, selectedModel: defaultSettings.selectedModel }
  }
  // 2 → 3: Prism's Tata 1mg Dopamine system becomes the default unless someone picked another one.
  if (version < 3 && (!p.defaultDesignSystemId || p.defaultDesignSystemId === "ds_wireframe")) p.defaultDesignSystemId = DEFAULT_DESIGN_SYSTEM_ID
  return p
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
  /** Edits layered on a design system's extracted reference, by design system id */
  designEdits: Record<string, DesignEdits>
  patchDesignEdits: (dsId: string, fn: (e: DesignEdits) => DesignEdits) => void
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
  /** The prototype frame open in the player */
  playing: string | null
  playPrototype: (id: string | null) => void
  /** The notes document open in the reader */
  reading: string | null
  openNotes: (id: string | null) => void
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
  patchProvider: (id: ProviderId, patch: Partial<ProviderKeyState>) => void
  patchProduct: (patch: Partial<ProductLibrary> | ((p: ProductLibrary) => Partial<ProductLibrary>)) => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      route: "home",
      setRoute: (route) => set({ route, selection: [] }),
      openProject: (id, mode = "canvas") => set({ activeId: id, route: "project", mode, selection: [] }),
      designSystems: [],
      defaultDesignSystemId: DEFAULT_DESIGN_SYSTEM_ID,
      upsertDesignSystem: (ds) =>
        set((s) => ({ designSystems: s.designSystems.some((d) => d.id === ds.id) ? s.designSystems.map((d) => (d.id === ds.id ? ds : d)) : [...s.designSystems, ds] })),
      deleteDesignSystem: (id) =>
        set((s) => ({
          designSystems: s.designSystems.filter((d) => d.id !== id),
          defaultDesignSystemId: s.defaultDesignSystemId === id ? DEFAULT_DESIGN_SYSTEM_ID : s.defaultDesignSystemId,
        })),
      setDefaultDesignSystem: (defaultDesignSystemId) => set({ defaultDesignSystemId }),
      designEdits: {},
      patchDesignEdits: (dsId, fn) => set((s) => ({ designEdits: { ...s.designEdits, [dsId]: fn(s.designEdits[dsId] ?? {}) } })),
      connectors: [],
      upsertConnector: (c) => set((s) => ({ connectors: s.connectors.some((x) => x.id === c.id) ? s.connectors.map((x) => (x.id === c.id ? c : x)) : [...s.connectors, c] })),
      patchConnector: (id, patch) => set((s) => ({ connectors: s.connectors.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteConnector: (id) => set((s) => ({ connectors: s.connectors.filter((x) => x.id !== id) })),
      mode: "canvas",
      conversations: [],
      activeId: "",
      selection: [],
      tool: "select",
      settings: defaultSettings,
      product: defaultProduct,
      history: {},
      focus: null,
      playing: null,
      playPrototype: (id) => set({ playing: id }),
      reading: null,
      openNotes: (id) => set({ reading: id }),
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
          if (!rest.length) return { conversations: [], activeId: "", selection: [], route: s.route === "project" ? "home" : s.route }
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
      version: 3,
      migrate: migrate as (p: unknown, v: number) => Partial<State>,
      storage: safeStorage as PersistStorage<Partial<State>>,
      partialize: (s) => ({
        conversations: s.conversations,
        activeId: s.activeId,
        settings: s.settings,
        product: s.product,
        route: s.route,
        designSystems: s.designSystems,
        defaultDesignSystemId: s.defaultDesignSystemId,
        designEdits: s.designEdits,
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
