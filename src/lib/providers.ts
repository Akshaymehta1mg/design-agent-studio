import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"
import type { ModelInfo, ProviderId, ProviderKeyState } from "./types"
import { accessHeaders, proxyBase, viaServer } from "./server"

export type KeyedProvider = ProviderId

export const PROVIDERS: Record<KeyedProvider, { name: string; vendor: string; placeholder: string; keyUrl: string; hint: string }> = {
  anthropic: { name: "Claude", vendor: "Anthropic", placeholder: "sk-ant-…", keyUrl: "https://console.anthropic.com/settings/keys", hint: "console.anthropic.com → API keys" },
  openai: { name: "GPT", vendor: "OpenAI", placeholder: "sk-…", keyUrl: "https://platform.openai.com/api-keys", hint: "platform.openai.com → API keys" },
  google: { name: "Gemini", vendor: "Google AI Studio", placeholder: "AIza…", keyUrl: "https://aistudio.google.com/apikey", hint: "aistudio.google.com → Get API key" },
  openrouter: { name: "Any model", vendor: "OpenRouter", placeholder: "sk-or-…", keyUrl: "https://openrouter.ai/keys", hint: "openrouter.ai → Keys" },
  moonshot: { name: "Kimi", vendor: "Moonshot AI", placeholder: "sk-…", keyUrl: "https://platform.moonshot.ai/console/api-keys", hint: "platform.moonshot.ai → API keys (keys from the China site, moonshot.cn, don't work here)" },
  custom: { name: "Custom", vendor: "OpenAI-compatible", placeholder: "key (optional for local servers)", keyUrl: "", hint: "Groq, Together, LM Studio, Ollama… any /v1/models + /v1/chat/completions endpoint" },
}

export const PROVIDER_ORDER: KeyedProvider[] = ["anthropic", "openai", "google", "openrouter", "moonshot", "custom"]

const ANTHROPIC_HEADERS = (key: string) => ({
  "x-api-key": key,
  "anthropic-version": "2023-06-01",
  // Anthropic requires this opt-in for calls made straight from a browser.
  "anthropic-dangerous-direct-browser-access": "true",
})

async function getJson(url: string, init: RequestInit = {}) {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new Error("Couldn't reach the provider. Check your connection, or whether this page is allowed to make network requests.")
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const j = await res.json()
      msg = j?.error?.message || j?.error || j?.message || msg
    } catch {
      /* ignore */
    }
    if (res.status === 401 || res.status === 403) msg = `The key was rejected (${res.status}). ${typeof msg === "string" ? msg : ""}`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return res.json()
}

const OPENAI_SKIP = /(embed|whisper|tts|dall-e|moderation|audio|realtime|transcribe|image|search|babbage|davinci|computer-use|codex-mini)/i

const MOONSHOT_BASE = "https://api.moonshot.ai"
/** "kimi-k2-turbo-preview" → "Kimi K2 Turbo Preview" */
const kimiName = (id: string) => id.replace(/^kimi-/i, "Kimi-").split("-").map((w) => (/^k\d/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ")

/** Fetch every model the key can use, straight from the provider's list endpoint. */
export async function fetchModels(provider: KeyedProvider, state: ProviderKeyState): Promise<ModelInfo[]> {
  const key = state.apiKey.trim()
  const server = provider !== "custom" && viaServer(provider)
  const base = (direct: string) => (server ? proxyBase(provider as "anthropic") : direct)
  const auth = (h: Record<string, string>) => (server ? accessHeaders() : h)
  switch (provider) {
    case "anthropic": {
      const out: ModelInfo[] = []
      let after: string | undefined
      for (let i = 0; i < 5; i++) {
        const j = await getJson(`${base("https://api.anthropic.com")}/v1/models?limit=100${after ? `&after_id=${after}` : ""}`, { headers: server ? { ...accessHeaders(), "anthropic-version": "2023-06-01" } : ANTHROPIC_HEADERS(key) })
        for (const m of j.data ?? []) out.push({ id: m.id, name: m.display_name ?? m.id, provider, vision: true })
        if (!j.has_more) break
        after = j.last_id
      }
      return out
    }
    case "openai": {
      const j = await getJson(`${base("https://api.openai.com")}/v1/models`, { headers: auth({ Authorization: `Bearer ${key}` }) })
      return (j.data ?? [])
        .filter((m: { id: string }) => /^(gpt|o\d|chatgpt)/i.test(m.id) && !OPENAI_SKIP.test(m.id))
        .sort((a: { created: number }, b: { created: number }) => b.created - a.created)
        .map((m: { id: string }) => ({ id: m.id, name: m.id, provider, vision: !/gpt-3\.5|o1-mini|o3-mini/i.test(m.id) }))
    }
    case "google": {
      const j = await getJson(`${base("https://generativelanguage.googleapis.com")}/v1beta/models?pageSize=200`, { headers: auth({ "x-goog-api-key": key }) })
      return (j.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[]; name: string }) => m.supportedGenerationMethods?.includes("generateContent") && /gemini|gemma/i.test(m.name) && !/embedding|aqa|tts|image/i.test(m.name))
        .map((m: { name: string; displayName?: string; inputTokenLimit?: number }) => ({
          id: m.name.replace(/^models\//, ""),
          name: m.displayName ?? m.name,
          provider,
          vision: /gemini/i.test(m.name),
          context: m.inputTokenLimit,
        }))
    }
    case "openrouter": {
      // Validate the key first (the model list itself is public).
      await getJson(`${base("https://openrouter.ai/api")}/v1/key`, { headers: auth({ Authorization: `Bearer ${key}` }) })
      const j = await getJson(`${base("https://openrouter.ai/api")}/v1/models`, { headers: server ? accessHeaders() : {} })
      return (j.data ?? [])
        .filter((m: { architecture?: { output_modalities?: string[] } }) => (m.architecture?.output_modalities ?? ["text"]).includes("text"))
        .map((m: { id: string; name: string; context_length?: number; architecture?: { input_modalities?: string[] } }) => ({
          id: m.id,
          name: m.name,
          provider,
          vision: m.architecture?.input_modalities?.includes("image") ?? false,
          context: m.context_length,
        }))
    }
    case "moonshot": {
      const j = await getJson(`${base(MOONSHOT_BASE)}/v1/models`, { headers: auth({ Authorization: `Bearer ${key}` }) })
      return (j.data ?? [])
        .filter((m: { id: string }) => !/embed|tts|asr|audio/i.test(m.id))
        .map((m: { id: string; context_length?: number; supports_image_in?: boolean }) => ({
          id: m.id,
          name: kimiName(m.id),
          provider,
          vision: m.supports_image_in ?? /vision|vl\b|kimi-latest|k2\.5|kimi-k[3-9]/i.test(m.id),
          context: m.context_length,
        }))
    }
    case "custom": {
      const base = (state.baseUrl ?? "").replace(/\/+$/, "")
      if (!base) throw new Error("Add the base URL, for example https://api.groq.com/openai/v1")
      const j = await getJson(`${base}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {} })
      return (j.data ?? j.models ?? []).map((m: { id?: string; name?: string }) => ({ id: m.id ?? m.name, name: m.id ?? m.name, provider, vision: true }))
    }
  }
}

/** Build an AI SDK model for a provider + model id. Calls go straight from the browser with the user's key. */
export function getLanguageModel(provider: KeyedProvider, modelId: string, state: ProviderKeyState): LanguageModel {
  const key = state.apiKey.trim()
  if (provider !== "custom" && viaServer(provider)) {
    // The deployment adds the real key; "server" is a placeholder the proxy replaces.
    const headers = accessHeaders()
    const base = proxyBase(provider)
    switch (provider) {
      case "anthropic":
        return createAnthropic({ apiKey: "server", baseURL: `${base}/v1`, headers })(modelId)
      case "openai":
        return createOpenAI({ apiKey: "server", baseURL: `${base}/v1`, headers }).chat(modelId)
      case "google":
        return createGoogleGenerativeAI({ apiKey: "server", baseURL: `${base}/v1beta`, headers })(modelId)
      case "openrouter":
        return createOpenAICompatible({ name: "openrouter", baseURL: `${base}/v1`, apiKey: "server", headers: { ...headers, "X-Title": "Prism" } })(modelId)
      case "moonshot":
        return createOpenAICompatible({ name: "moonshot", baseURL: `${base}/v1`, apiKey: "server", headers })(modelId)
    }
  }
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey: key, headers: { "anthropic-dangerous-direct-browser-access": "true" } })(modelId)
    case "openai":
      return createOpenAI({ apiKey: key }).chat(modelId)
    case "google":
      return createGoogleGenerativeAI({ apiKey: key })(modelId)
    case "openrouter":
      return createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: key,
        headers: { "HTTP-Referer": typeof location !== "undefined" ? location.origin : "", "X-Title": "Prism" },
      })(modelId)
    case "moonshot":
      return createOpenAICompatible({ name: "moonshot", baseURL: `${MOONSHOT_BASE}/v1`, apiKey: key })(modelId)
    case "custom":
      return createOpenAICompatible({ name: "custom", baseURL: (state.baseUrl ?? "").replace(/\/+$/, ""), apiKey: key || undefined })(modelId)
  }
}

/** A sensible default when a key's models first load. */
export function pickDefaultModel(models: ModelInfo[]): ModelInfo | undefined {
  const prefs = [/claude-(opus|sonnet)-[45]/i, /claude-sonnet/i, /gpt-5(?!.*nano)/i, /gpt-4\.1(?!-nano)/i, /gpt-4o(?!-mini)/i, /gemini-2\.5-pro|gemini-3.*pro/i, /gemini.*flash/i, /anthropic\/claude-sonnet/i, /kimi-k2(?!.*(turbo|mini))/i, /kimi-latest/i]
  for (const p of prefs) {
    const m = models.find((x) => p.test(x.id))
    if (m) return m
  }
  return models.find((m) => m.vision) ?? models[0]
}
