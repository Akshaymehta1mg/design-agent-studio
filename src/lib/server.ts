import { create } from "zustand"
import { useStore } from "./store"

/**
 * When the app runs on its Vercel deployment, /api/config says which providers
 * have server-side keys. Calls to those go through /api/p/<provider>/…, where
 * the key is added on the server and never reaches the browser.
 */
export type ServerUpstream = "anthropic" | "openai" | "google" | "openrouter" | "moonshot" | "figma"

interface ServerState {
  checked: boolean
  deployed: boolean
  accessRequired: boolean
  authorized: boolean
  providers: Partial<Record<ServerUpstream, boolean>>
}

export const useServer = create<ServerState>(() => ({ checked: false, deployed: false, accessRequired: false, authorized: false, providers: {} }))

export const accessHeaders = (): Record<string, string> => {
  const code = useStore.getState().settings.accessCode?.trim()
  return code ? { "x-access-code": code } : {}
}

export const proxyBase = (u: ServerUpstream) => `${location.origin}/api/p/${u}`

/** True when calls for this provider should go through the deployment's key. */
export function viaServer(u: ServerUpstream) {
  const s = useServer.getState()
  if (!s.deployed || !s.authorized || !s.providers[u]) return false
  if (u === "figma") return !useStore.getState().settings.figmaToken.trim()
  return !useStore.getState().settings.providers[u as Exclude<ServerUpstream, "figma">]?.apiKey.trim()
}

export async function checkServer() {
  try {
    const res = await fetch("/api/config", { headers: accessHeaders(), cache: "no-store" })
    const type = res.headers.get("content-type") ?? ""
    if (!res.ok || !type.includes("json")) throw new Error("no backend")
    const j = await res.json()
    useServer.setState({ checked: true, deployed: !!j.deployed, accessRequired: !!j.accessRequired, authorized: !!j.authorized, providers: j.providers ?? {} })
  } catch {
    // Local `npm run dev`, a static host, or the hosted preview: no backend, personal keys only.
    useServer.setState({ checked: true, deployed: false, accessRequired: false, authorized: false, providers: {} })
  }
  return useServer.getState()
}
