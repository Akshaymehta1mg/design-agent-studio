// Shared by the Vercel functions in /api. Runs on the Edge runtime (Web Request/Response).

export type Upstream = "anthropic" | "openai" | "google" | "openrouter" | "moonshot" | "figma"

interface UpstreamDef {
  base: string
  env: string
  /** Paths the proxy will forward. Anything else is refused. */
  allow: RegExp
  auth: (key: string) => Record<string, string>
}

export const UPSTREAMS: Record<Upstream, UpstreamDef> = {
  anthropic: {
    base: "https://api.anthropic.com",
    env: "ANTHROPIC_API_KEY",
    allow: /^\/v1\/(messages|models)(\/|$|\?)/,
    auth: (k) => ({ "x-api-key": k }),
  },
  openai: {
    base: "https://api.openai.com",
    env: "OPENAI_API_KEY",
    allow: /^\/v1\/(chat\/completions|responses|models)(\/|$|\?)/,
    auth: (k) => ({ authorization: `Bearer ${k}` }),
  },
  google: {
    base: "https://generativelanguage.googleapis.com",
    env: "GOOGLE_API_KEY",
    allow: /^\/v1beta\/models(\/|$|\?|:)/,
    auth: (k) => ({ "x-goog-api-key": k }),
  },
  openrouter: {
    base: "https://openrouter.ai/api",
    env: "OPENROUTER_API_KEY",
    allow: /^\/v1\/(chat\/completions|models|key)(\/|$|\?)/,
    auth: (k) => ({ authorization: `Bearer ${k}` }),
  },
  moonshot: {
    base: "https://api.moonshot.ai",
    env: "MOONSHOT_API_KEY",
    allow: /^\/v1\/(chat\/completions|models)(\/|$|\?)/,
    auth: (k) => ({ authorization: `Bearer ${k}` }),
  },
  figma: {
    base: "https://api.figma.com",
    env: "FIGMA_TOKEN",
    allow: /^\/v1\/(files|images)\//,
    auth: (k) => ({ "x-figma-token": k }),
  },
}

const env = (name: string) => (typeof process !== "undefined" ? process.env[name] : undefined)?.trim() || undefined

export const serverKey = (u: Upstream) => env(UPSTREAMS[u].env)
export const accessCode = () => env("ACCESS_CODE")

/** Constant-time string compare so the access code can't be guessed by timing. */
export function safeEqual(a: string, b: string) {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

export function checkAccess(req: Request): Response | null {
  const code = accessCode()
  if (!code) return null
  const given = req.headers.get("x-access-code") ?? ""
  if (safeEqual(given, code)) return null
  return json({ error: { message: "Access code required. Enter it in Settings." } }, 401)
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
}
