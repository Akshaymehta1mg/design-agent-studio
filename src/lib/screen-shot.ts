import { toJpeg } from "html-to-image"
import type { DesignSystem, FrameNode, PrototypeScreen } from "./types"
import { wireframeVars } from "./design-systems"
import { buildPrototypeDoc, DEVICE_SIZES, PHONE_SAFE_AREA_CSS } from "./wireframe"

/** Render one prototype screen offscreen, exactly as the player shows it at rest, and return a JPEG data URL. */
async function shoot(screen: PrototypeScreen, css: string, w: number, h: number): Promise<string | null> {
  if (typeof document === "undefined") return null
  const frame = document.createElement("iframe")
  // Same-origin so the page can read the render; no scripts, so nothing in the screen runs.
  frame.setAttribute("sandbox", "allow-same-origin")
  frame.setAttribute("aria-hidden", "true")
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px;border:0;pointer-events:none`
  frame.srcdoc = buildPrototypeDoc([screen], screen.id, css)
  document.body.appendChild(frame)
  try {
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve()
      setTimeout(resolve, 4000)
    })
    const doc = frame.contentDocument
    if (!doc?.body) return null
    // Give images and web fonts a moment; a screen that never finishes loading is still worth a look.
    await Promise.race([Promise.all([doc.fonts?.ready, ...[...doc.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r))))]), new Promise((r) => setTimeout(r, 1500))])
    return await toJpeg(doc.documentElement, { width: w, height: h, quality: 0.72, pixelRatio: 1, backgroundColor: "#ffffff", skipFonts: true })
  } catch {
    return null
  } finally {
    frame.remove()
  }
}

/** Screenshots of a prototype's screens (at most `limit`), for the model to review its own work. */
export async function screenshotScreens(f: FrameNode, ds: DesignSystem | undefined, ids: string[], limit = 6) {
  const phone = (f.device ?? (f.w < 600 ? "mobile" : "desktop")) === "mobile"
  const w = phone ? DEVICE_SIZES.mobile.w : f.w
  const h = phone ? DEVICE_SIZES.mobile.h : f.h
  const css = wireframeVars(ds) + (phone ? PHONE_SAFE_AREA_CSS : "")
  const out: { id: string; title: string; jpeg: string }[] = []
  for (const s of (f.screens ?? []).filter((x) => ids.includes(x.id)).slice(0, limit)) {
    const jpeg = await shoot(s, css, w, h)
    if (jpeg) out.push({ id: s.id, title: s.title, jpeg })
  }
  return out
}
