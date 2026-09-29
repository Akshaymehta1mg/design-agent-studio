import { useServer } from "./server"

/**
 * fetch() that falls back to the deployment's /api/relay when the browser can't reach a host directly
 * (typically CORS). The relay only forwards to an allowlist (Mobbin, Pinterest images).
 */
export async function relayFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input)
  try {
    return await fetch(input, init)
  } catch (e) {
    if (!useServer.getState().deployed || !/^https:/.test(url)) throw e
    const req = input instanceof Request ? input : null
    return fetch(`${location.origin}/api/relay?url=${encodeURIComponent(url)}`, {
      method: init?.method ?? req?.method,
      headers: init?.headers ?? req?.headers,
      body: init?.body ?? (req && req.method !== "GET" && req.method !== "HEAD" ? await req.clone().arrayBuffer() : undefined),
      signal: init?.signal ?? req?.signal,
    })
  }
}

/** Fetch an image (directly or via the relay), downscale it, and return base64 for a model. */
export async function imageForModel(url: string, maxSide = 1400): Promise<{ data: string; mediaType: string } | null> {
  try {
    const res = await relayFetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = objectUrl
      })
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
      const c = document.createElement("canvas")
      c.width = Math.max(1, Math.round(img.naturalWidth * scale))
      c.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = c.getContext("2d")!
      ctx.fillStyle = "#fff"
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      return { data: c.toDataURL("image/jpeg", 0.85).split(",")[1], mediaType: "image/jpeg" }
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    return null
  }
}
