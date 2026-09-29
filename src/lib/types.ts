// ───────────────────────────── Canvas ─────────────────────────────

export type FrameSource = "upload" | "figma" | "agent" | "live" | "product"
export type Device = "mobile" | "desktop" | "tablet"

export interface FrameNode {
  id: string
  kind: "frame"
  /** image = a screenshot/export, wireframe = agent-generated HTML, workflow = a flow diagram */
  type: "image" | "wireframe" | "workflow"
  x: number
  y: number
  w: number
  h: number
  title: string
  source: FrameSource
  /** data: URL or remote URL for image frames */
  src?: string
  /** HTML fragment for wireframe frames */
  html?: string
  /** Graph for workflow frames */
  workflow?: Workflow
  device?: Device
  /** Design system the wireframe was drawn with */
  designSystemId?: string
  /** Every iteration of a wireframe shares a lineage and gets the next version number. */
  lineageId?: string
  version?: number
  /** The frame this version was iterated from */
  parentId?: string
  changeSummary?: string
  figma?: { fileKey: string; nodeId?: string }
  createdAt: number
}

export interface NoteNode {
  id: string
  kind: "note"
  x: number
  y: number
  w: number
  h: number
  title?: string
  text: string
  author: "agent" | "user"
  createdAt: number
}

export type CanvasNode = FrameNode | NoteNode

/** Marks live on a frame. Coordinates are fractions (0..1) of the frame. */
export interface Mark {
  id: string
  frameId: string
  type: "annotation" | "comment"
  x: number
  y: number
  w?: number
  h?: number
  text: string
  severity?: "critical" | "major" | "minor" | "positive"
  author: "agent" | "user"
  n: number
  createdAt: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasDoc {
  nodes: CanvasNode[]
  marks: Mark[]
  viewport: Viewport
}

// ───────────────────────────── Workflows ─────────────────────────────

export interface WorkflowNode {
  id: string
  title: string
  description?: string
  content?: string
  footer?: string
  kind?: "start" | "step" | "decision" | "end"
}

export interface WorkflowEdge {
  from: string
  to: string
  label?: string
  /** "loop" edges are drawn as dashed return paths (retry, back, iterate) */
  kind?: "main" | "loop"
}

export interface Workflow {
  title: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

// ───────────────────────────── Chat ─────────────────────────────

export type PlanStatus = "pending" | "in-progress" | "completed" | "cancelled"

export interface AskQuestion {
  id: string
  title: string
  description?: string
  options?: { value: string; label: string }[]
  multiple?: boolean
  allowCustom?: boolean
}

export type AskStatus = "pending" | "submitting" | "approved" | "rejected" | "changes-requested" | "answered"

/** An assistant message is an ordered list of parts, so plans, questions and workflows sit where they happened. */
export type MessagePart =
  | { type: "text"; id: string; text: string }
  | { type: "plan"; id: string; title: string; items: { id: string; title: string; status: PlanStatus }[] }
  | { type: "ask"; id: string; title: string; description?: string; questions?: AskQuestion[]; approveLabel?: string; status: AskStatus; result?: string }
  | { type: "workflow"; id: string; frameId: string; workflow: Workflow }


export type Attachment =
  | { kind: "frame"; frameId: string; title: string; thumb?: string }
  | { kind: "file"; name: string; mime: string; size: number; text?: string; dataUrl?: string }
  | { kind: "figma"; url: string; fileKey: string; nodeId?: string; title: string }
  | { kind: "product"; title: string }

export interface ActionLog {
  id: string
  label: string
  /** node to focus when the chip is clicked */
  targetId?: string
  tone?: "create" | "mark" | "note" | "figma" | "error"
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  attachments?: Attachment[]
  actions?: ActionLog[]
  parts?: MessagePart[]
  model?: string
  status?: "streaming" | "done" | "error"
  /** what the agent is doing right now, shown while streaming */
  activity?: string
  error?: string
  createdAt: number
}

export interface FigmaLink {
  url: string
  fileKey: string
  nodeId?: string
  fileName?: string
  allowComments: boolean
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  canvas: CanvasDoc
  figma?: FigmaLink
  /** Design system this project designs with */
  designSystemId?: string
}

// ───────────────────────────── Product library ─────────────────────────────

export interface ProductScreen {
  id: string
  name: string
  src: string
  summary?: string
  status: "new" | "reading" | "read" | "error"
}

export type DesignSystemSource = "screens" | "figma" | "tokens"

export interface DesignSystemState {
  source: DesignSystemSource
  figmaUrl?: string
  tokensUrl?: string
  tokensRaw?: string
  /** Compact, prompt-ready profile of colors, type, components, patterns and voice. */
  profile?: string
  syncedAt?: number
  status?: "idle" | "syncing" | "error"
  error?: string
}

export interface ContextDoc {
  id: string
  name: string
  text: string
  size: number
  addedAt: number
}

export interface ProductLibrary {
  /** Longer free-form brief: PRD notes, research findings, principles */
  brief?: string
  docs?: ContextDoc[]
  about: string
  audience: string
  goals: string
  constraints: string
  voice: string
  screens: ProductScreen[]
  designSystem: DesignSystemState
  useInConversations: boolean
}

// ───────────────────────────── Settings / models ─────────────────────────────

export type ProviderId = "anthropic" | "openai" | "google" | "openrouter" | "custom"

export interface ModelInfo {
  id: string
  name: string
  provider: ProviderId
  vision?: boolean
  context?: number
}

export interface ProviderKeyState {
  apiKey: string
  baseUrl?: string
  label?: string
  status: "empty" | "checking" | "ok" | "error"
  error?: string
  models: ModelInfo[]
  fetchedAt?: number
  /** Models were loaded through the deployment's key */
  server?: boolean
}

export interface Settings {
  providers: Record<ProviderId, ProviderKeyState>
  figmaToken: string
  /** An empty id means no model has been picked yet. */
  selectedModel: { provider: ProviderId; id: string; name: string }
  speakReplies: boolean
  theme: "system" | "light" | "dark"
  profileName?: string
  /** Code for this deployment's server keys (see /api) */
  accessCode?: string
}

export type Mode = "canvas" | "live"

export type Page = "home" | "files" | "connectors" | "context" | "design-systems" | "settings" | "project"

// ───────────────────────────── Design systems ─────────────────────────────

export interface DesignSystem {
  id: string
  name: string
  description: string
  builtIn?: boolean
  source: "builtin" | "figma" | "tokens" | "screens" | "manual"
  figmaUrl?: string
  tokensUrl?: string
  tokensRaw?: string
  /** Prompt-ready profile the agent treats as ground truth */
  profile: string
  colors: { name: string; value: string }[]
  font?: string
  radius?: number
  updatedAt: number
  status?: "idle" | "syncing" | "error"
  error?: string
}

// ───────────────────────────── Connectors (MCP) ─────────────────────────────

export interface Connector {
  id: string
  name: string
  url: string
  transport: "http" | "sse"
  token?: string
  enabled: boolean
  status: "untested" | "checking" | "ok" | "error"
  error?: string
  tools: { name: string; description?: string }[]
  catalogId?: string
  addedAt: number
}
