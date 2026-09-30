import { uid, useStore } from "./store"

export interface DebugToolCall {
  name: string
  input: unknown
  result?: unknown
  error?: string
}

export interface DebugLogEntry {
  id: string
  timestamp: number
  convId: string
  convTitle: string
  phase: string
  model: string
  compact: boolean
  dsId?: string
  systemPrompt: string
  historyPreview: string
  responseText: string
  toolCalls: DebugToolCall[]
  finishReason?: string
  /** One per model step; "length" means that step ran out of output tokens. */
  stepFinishReasons?: string[]
  maxOutputTokens?: number
  inputTokens?: number
  outputTokens?: number
  durationMs: number
  error?: string
}

const MAX_ENTRIES = 100
const MAX_FIELD_LEN = 40_000

const truncate = (s: string) => (s.length > MAX_FIELD_LEN ? s.slice(0, MAX_FIELD_LEN) + `\n\n… [truncated, ${s.length - MAX_FIELD_LEN} chars omitted]` : s)

const sanitizeMessages = (messages: unknown[]): string => {
  try {
    return JSON.stringify(
      messages.map((m: unknown) => {
        const msg = m as { role?: string; content?: unknown }
        if (typeof msg.content === "string") return { role: msg.role, content: msg.content }
        if (Array.isArray(msg.content)) {
          return {
            role: msg.role,
            content: msg.content.map((p: unknown) => {
              const part = p as { type?: string; text?: string; image?: unknown; mediaType?: string }
              if (part.type === "image" || part.type === "file" || part.type === "media") {
                return { type: part.type, mediaType: part.mediaType, image: "[binary omitted]" }
              }
              return part
            }),
          }
        }
        return { role: msg.role, content: msg.content }
      }),
      null,
      2,
    )
  } catch {
    return "[serialization failed]"
  }
}

export function pushDebugLog(entry: Omit<DebugLogEntry, "id" | "timestamp"> & { historyMessages?: unknown[] }) {
  const { historyMessages, ...rest } = entry
  const log: DebugLogEntry = {
    id: uid("dl_"),
    timestamp: Date.now(),
    ...rest,
    systemPrompt: truncate(rest.systemPrompt),
    historyPreview: historyMessages ? truncate(sanitizeMessages(historyMessages)) : rest.historyPreview,
    responseText: truncate(rest.responseText),
  }
  useStore.getState().appendDebugLog(log)
}

export function clearDebugLogs() {
  useStore.getState().clearDebugLogs()
}

export function exportDebugLogs(): string {
  return JSON.stringify(useStore.getState().debugLogs, null, 2)
}
