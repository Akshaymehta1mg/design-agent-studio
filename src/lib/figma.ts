/**
 * Figma REST API, called from the browser with a personal access token
 * (scopes: file_content:read, file_comments:write, optionally library_content:read).
 */

import { accessHeaders, proxyBase, viaServer } from "./server"

const API = "https://api.figma.com/v1"

/** A personal token, or the deployment's FIGMA_TOKEN when there is one. */
export const hasFigmaAccess = (token: string) => !!token.trim() || viaServer("figma")

export interface ParsedFigmaUrl {
  fileKey: string
  nodeId?: string
  fileName?: string
  kind: "design" | "file" | "proto" | "board" | "make"
}

export function parseFigmaUrl(raw: string): ParsedFigmaUrl | null {
  try {
    const u = new URL(raw.trim())
    if (!/(^|\.)figma\.com$/.test(u.hostname)) return null
    const parts = u.pathname.split("/").filter(Boolean)
    const kind = parts[0] as ParsedFigmaUrl["kind"]
    if (!["design", "file", "proto", "board", "make"].includes(kind)) return null
    let fileKey = parts[1]
    let name = parts[2]
    // branch links: /design/:fileKey/branch/:branchKey/:name
    if (parts[2] === "branch" && parts[3]) {
      fileKey = parts[3]
      name = parts[4]
    }
    const node = u.searchParams.get("node-id")
    return {
      fileKey,
      kind,
      nodeId: node ? node.replace(/-/g, ":") : undefined,
      fileName: name ? decodeURIComponent(name).replace(/-/g, " ") : undefined,
    }
  } catch {
    return null
  }
}

async function figmaFetch(path: string, token: string, init: RequestInit = {}) {
  let res: Response
  const server = !token && viaServer("figma")
  try {
    res = server
      ? await fetch(`${proxyBase("figma")}/v1${path}`, { ...init, headers: { ...accessHeaders(), ...(init.headers ?? {}) } })
      : await fetch(`${API}${path}`, { ...init, headers: { "X-Figma-Token": token, ...(init.headers ?? {}) } })
  } catch {
    throw new Error("Couldn't reach Figma. Check your connection.")
  }
  if (res.status === 403) throw new Error("Figma rejected the token (403). Check it has File content: read access to this file.")
  if (res.status === 404) throw new Error("Figma couldn't find that file. Check the link and that your account can open it.")
  if (res.status === 429) throw new Error("Figma is rate limiting requests. Wait a minute and try again.")
  if (!res.ok) throw new Error(`Figma error ${res.status}`)
  return res.json()
}

export interface FigmaFrame {
  id: string
  name: string
  w: number
  h: number
}

interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  absoluteBoundingBox?: { width: number; height: number }
}

const FRAMEISH = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION", "GROUP"])

function collectFrames(node: FigmaNode, out: FigmaFrame[], depth = 0) {
  if (out.length >= 12) return
  if (node.type === "SECTION" || node.type === "CANVAS" || node.type === "DOCUMENT") {
    node.children?.forEach((c) => collectFrames(c, out, depth + 1))
    return
  }
  if (FRAMEISH.has(node.type) && node.absoluteBoundingBox) {
    out.push({ id: node.id, name: node.name, w: node.absoluteBoundingBox.width, h: node.absoluteBoundingBox.height })
  }
}

/** Resolve the frames a link points at: the linked node (or its child frames), else the first page's top-level frames. */
export async function listFrames(fileKey: string, nodeId: string | undefined, token: string): Promise<{ fileName: string; frames: FigmaFrame[] }> {
  if (nodeId) {
    const j = await figmaFetch(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&depth=2`, token)
    const doc: FigmaNode | undefined = j.nodes?.[nodeId]?.document
    if (!doc) throw new Error("That node isn't in the file any more.")
    const frames: FigmaFrame[] = []
    if (doc.type === "CANVAS" || doc.type === "SECTION") collectFrames(doc, frames)
    else if (doc.absoluteBoundingBox) frames.push({ id: doc.id, name: doc.name, w: doc.absoluteBoundingBox.width, h: doc.absoluteBoundingBox.height })
    return { fileName: j.name, frames }
  }
  const j = await figmaFetch(`/files/${fileKey}?depth=2`, token)
  const page: FigmaNode | undefined = j.document?.children?.[0]
  const frames: FigmaFrame[] = []
  if (page) collectFrames(page, frames)
  return { fileName: j.name, frames }
}

/** Render frames to PNG. Figma returns short-lived URLs; we try to inline them so the canvas survives reloads. */
export async function exportFrames(fileKey: string, ids: string[], token: string, scale = 1): Promise<Record<string, string>> {
  const j = await figmaFetch(`/images/${fileKey}?ids=${ids.map(encodeURIComponent).join(",")}&format=png&scale=${scale}`, token)
  const urls: Record<string, string> = j.images ?? {}
  const out: Record<string, string> = {}
  await Promise.all(
    Object.entries(urls).map(async ([id, url]) => {
      if (!url) return
      try {
        const blob = await (await fetch(url)).blob()
        out[id] = await new Promise<string>((res) => {
          const r = new FileReader()
          r.onload = () => res(r.result as string)
          r.readAsDataURL(blob)
        })
      } catch {
        out[id] = url
      }
    }),
  )
  return out
}

/** Post a comment, pinned to a node when we know one. */
export async function postComment(fileKey: string, token: string, message: string, nodeId?: string, offset?: { x: number; y: number }) {
  const body: Record<string, unknown> = { message }
  if (nodeId) body.client_meta = { node_id: nodeId, node_offset: offset ?? { x: 0, y: 0 } }
  return figmaFetch(`/files/${fileKey}/comments`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

/** Pull the design-system surface of a library file: styles, components and (Enterprise) variables. */
export async function fetchDesignSystem(fileKey: string, token: string): Promise<string> {
  const lines: string[] = []
  const file = await figmaFetch(`/files/${fileKey}?depth=1`, token)
  lines.push(`Figma library: ${file.name}`)

  const styles = file.styles as Record<string, { name: string; styleType: string; description?: string }> | undefined
  if (styles) {
    const byType: Record<string, string[]> = {}
    for (const s of Object.values(styles)) (byType[s.styleType] ??= []).push(s.name)
    for (const [t, names] of Object.entries(byType)) lines.push(`${t} styles (${names.length}): ${names.slice(0, 60).join(", ")}`)
  }
  const components = file.components as Record<string, { name: string; description?: string }> | undefined
  if (components) {
    const names = [...new Set(Object.values(components).map((c) => c.name.split("/")[0].split("=")[0].trim()))]
    lines.push(`Components (${names.length}): ${names.slice(0, 80).join(", ")}`)
  }
  try {
    const vars = await figmaFetch(`/files/${fileKey}/variables/local`, token)
    const vs = Object.values(vars?.meta?.variables ?? {}) as { name: string; resolvedType: string }[]
    if (vs.length) {
      const byType: Record<string, string[]> = {}
      for (const v of vs) (byType[v.resolvedType] ??= []).push(v.name)
      for (const [t, names] of Object.entries(byType)) lines.push(`${t} variables (${names.length}): ${names.slice(0, 60).join(", ")}`)
    }
  } catch {
    // Variables API needs an Enterprise plan; styles and components are enough.
  }
  return lines.join("\n")
}
