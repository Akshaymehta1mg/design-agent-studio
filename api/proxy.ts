// Forwards model and Figma requests to the provider with the server's key.
// vercel.json rewrites /api/p/:upstream/:path* here.
import { UPSTREAMS, checkAccess, json, serverKey, type Upstream } from "./_shared"

export const config = { runtime: "edge" }

// Headers the browser sends that must not reach the provider.
const DROP = new Set(["host", "x-access-code", "cookie", "origin", "referer", "x-api-key", "authorization", "x-goog-api-key", "x-figma-token", "content-length", "connection", "accept-encoding"])

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const upstream = url.searchParams.get("upstream") as Upstream | null
  // Resolve dot segments (including %2e) before the allowlist check, as fetch would afterwards.
  const path = new URL("/" + (url.searchParams.get("path") ?? "").replace(/^\/+/, ""), "http://proxy.invalid").pathname
  if (!upstream || !(upstream in UPSTREAMS)) return json({ error: { message: "Unknown provider." } }, 404)

  const denied = checkAccess(req)
  if (denied) return denied

  const def = UPSTREAMS[upstream]
  const key = serverKey(upstream)
  if (!key) return json({ error: { message: `This deployment has no ${def.env}. Add it in Vercel, or use your own key in Settings.` } }, 501)

  // Rebuild the query string without our routing params (and without any ?key= a client might add).
  const qs = new URLSearchParams(url.searchParams)
  qs.delete("upstream")
  qs.delete("path")
  qs.delete("key")
  const target = `${def.base}${path}${qs.toString() ? `?${qs}` : ""}`
  if (!def.allow.test(path)) return json({ error: { message: `The proxy doesn't forward ${path}.` } }, 403)

  const headers = new Headers()
  req.headers.forEach((v, k) => {
    if (!DROP.has(k.toLowerCase())) headers.set(k, v)
  })
  for (const [k, v] of Object.entries(def.auth(key))) headers.set(k, v)

  const hasBody = req.method !== "GET" && req.method !== "HEAD"
  const res = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // Streaming a request body needs duplex: "half" (not yet in every RequestInit typing).
    ...(hasBody ? ({ duplex: "half" } as Record<string, unknown>) : {}),
  } as RequestInit)

  // Stream straight back (model responses are server-sent events).
  const out = new Headers(res.headers)
  out.delete("content-encoding")
  out.delete("content-length")
  out.set("cache-control", "no-store")
  return new Response(res.body, { status: res.status, headers: out })
}
