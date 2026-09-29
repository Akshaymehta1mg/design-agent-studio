export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
}

export function readAsText(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(r.error)
    r.readAsText(file)
  })
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => res(img)
    img.onerror = () => rej(new Error("Couldn't load image"))
    img.src = src
  })
}

/** Downscale so screenshots stay light in storage and within model image limits. */
export async function downscale(src: string, maxSide = 1800, type = "image/jpeg", quality = 0.86): Promise<{ src: string; w: number; h: number }> {
  const img = await loadImage(src)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)
  if (scale === 1 && src.startsWith("data:image/jpeg")) return { src, w, h }
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  try {
    return { src: c.toDataURL(type, quality), w, h }
  } catch {
    return { src, w: img.naturalWidth, h: img.naturalHeight }
  }
}

export async function imageFileToFrameData(file: File) {
  const raw = await readAsDataUrl(file)
  return downscale(raw, 2000, file.type === "image/png" ? "image/png" : "image/jpeg")
}

/** Display size on the canvas: phone screenshots at ~390 wide, desktop at ~1280. */
export function canvasSizeFor(w: number, h: number) {
  const target = w / h < 0.8 ? 390 : Math.min(1280, w)
  const s = target / w
  return { w: Math.round(w * s), h: Math.round(h * s) }
}

const TEXT_TYPES = /^(text\/|application\/(json|xml|x-yaml|yaml|csv|javascript|typescript|markdown))/
const TEXT_EXT = /\.(md|mdx|txt|csv|tsv|json|ya?ml|xml|html?|css|scss|js|jsx|ts|tsx|svg)$/i

export function isTextFile(f: File) {
  return TEXT_TYPES.test(f.type) || TEXT_EXT.test(f.name)
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function dataUrlParts(dataUrl: string): { mediaType: string; base64: string } | null {
  const m = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl)
  return m ? { mediaType: m[1], base64: m[2] } : null
}
