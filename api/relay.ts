// Forwards browser requests to a short allowlist of hosts that don't allow cross-origin calls:
// Mobbin's MCP server and sign-in, and Pinterest's image CDN (for the visual-research library).
// /api/relay?url=<encoded https URL>
import { json } from "./_shared"

export const config = { runtime: "edge" }

const DEFAULT_HOSTS = ["mobbin.com", "i.pinimg.com"]

/** Exact host or any subdomain of an allowed host. MCP_RELAY_HOSTS (comma-separated) adds more. */
function allowed(host: string) {
  const extra = (typeof process !== "undefined" ? process.env.MCP_RELAY_HOSTS : "")?.split(",").map((h) => h.trim()).filter(Boolean) ?? []
  return [...DEFAULT_HOSTS, ...extra].some((h) => host === h || host.endsWith(`.${h}`))
}

// Request headers worth forwarding: auth, content negotiation and the MCP session headers.
const FORWARD = ["authorization", "content-type", "accept", "mcp-session-id", "mcp-protocol-version", "last-event-id"]
// Response headers the browser needs to see.
const EXPOSE = ["mcp-session-id", "www-authenticate", "content-type", "location"]

export default async function handler(req: Request): Promise<Response> {
  let target: URL
  try {
    target = new URL(new URL(req.url).searchParams.get("url") ?? "")
  } catch {
    return json({ error: { message: "Pass ?url=<https URL>." } }, 400)
  }
  if (target.protocol !== "https:" || !allowed(target.hostname)) return json({ error: { message: `The relay doesn't forward to ${target.hostname}.` } }, 403)

  const headers = new Headers()
  for (const k of FORWARD) {
    const v = req.headers.get(k)
    if (v) headers.set(k, v)
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD"
  const res = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    redirect: "manual",
    ...(hasBody ? ({ duplex: "half" } as Record<string, unknown>) : {}),
  } as RequestInit)

  const out = new Headers()
  res.headers.forEach((v, k) => {
    if (!["content-encoding", "content-length", "set-cookie", "connection", "transfer-encoding"].includes(k)) out.set(k, v)
  })
  out.set("access-control-expose-headers", EXPOSE.join(", "))
  out.set("cache-control", target.hostname === "i.pinimg.com" ? "public, max-age=86400" : "no-store")
  return new Response(res.body, { status: res.status, headers: out })
}
