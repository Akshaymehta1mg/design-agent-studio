import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { UnauthorizedError, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js"
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js"
import { jsonSchema, tool, type Tool } from "ai"
import { relayFetch } from "./relay"
import type { Connector } from "./types"

/** Remote MCP servers the studio knows about. Most need an access token (or OAuth done elsewhere). */
export type ConnectorCategory = "Research" | "Design" | "Planning" | "Docs" | "Code"
export const CONNECTOR_CATALOG: { id: string; name: string; category: ConnectorCategory; description: string; url: string; transport: "http" | "sse"; auth?: "token" | "oauth"; note?: string }[] = [
  { id: "mobbin", category: "Research", name: "Mobbin", description: "Search real app screens and flows. Prism uses it for its reference and visual-pattern research.", url: "https://api.mobbin.com/mcp", transport: "http", auth: "oauth", note: "Sign in with your Mobbin account. Screen search needs a Mobbin plan with MCP access." },
  { id: "figma-desktop", category: "Design", name: "Figma (desktop)", description: "Selection, variables and components from the Figma desktop app's local Dev Mode server.", url: "http://127.0.0.1:3845/mcp", transport: "http", note: "Turn on the Dev Mode MCP server in Figma's preferences first." },
  { id: "figma", category: "Design", name: "Figma (remote)", description: "Read design context and frames from files you can open.", url: "https://mcp.figma.com/mcp", transport: "http", note: "Needs an OAuth access token." },
  { id: "linear", category: "Planning", name: "Linear", description: "Read and create issues and projects so crits turn into tickets.", url: "https://mcp.linear.app/mcp", transport: "http", note: "Needs a Linear API key or OAuth token." },
  { id: "notion", category: "Docs", name: "Notion", description: "Pull PRDs and research notes into the conversation.", url: "https://mcp.notion.com/mcp", transport: "http", note: "Needs an OAuth token." },
  { id: "github", category: "Code", name: "GitHub", description: "Look up components and tokens in your design system repo.", url: "https://api.githubcopilot.com/mcp/", transport: "http", note: "Needs a GitHub personal access token." },
  { id: "atlassian", category: "Planning", name: "Jira & Confluence", description: "Read specs and file issues in Atlassian products.", url: "https://mcp.atlassian.com/v1/sse", transport: "sse", note: "Needs an OAuth token." },
]

// ───────── OAuth for connectors that sign in through the browser (Mobbin, Figma, Linear, Notion…) ─────────

const OAUTH_KEY = (id: string) => `das:mcp-oauth:${id}`
const OAUTH_CALLBACK = () => `${location.origin}/oauth-callback.html`

type OAuthStore = { client?: OAuthClientInformationMixed; tokens?: OAuthTokens; verifier?: string; state?: string }

function readStore(id: string): OAuthStore {
  try {
    return JSON.parse(localStorage.getItem(OAUTH_KEY(id)) ?? "{}")
  } catch {
    return {}
  }
}
function writeStore(id: string, patch: Partial<OAuthStore>) {
  try {
    localStorage.setItem(OAUTH_KEY(id), JSON.stringify({ ...readStore(id), ...patch }))
  } catch {
    /* storage unavailable: sign-in lasts for this page only */
  }
}
export const hasOAuthTokens = (id: string) => !!readStore(id).tokens?.access_token
export function signOutConnector(id: string) {
  try {
    localStorage.removeItem(OAUTH_KEY(id))
  } catch {
    /* ignore */
  }
}

/** Stores the OAuth client, tokens and PKCE verifier in this browser. Sign-in happens in a pop-up. */
class BrowserOAuthProvider implements OAuthClientProvider {
  private code?: Promise<{ code: string; state?: string }>
  constructor(
    private id: string,
    /** A pop-up opened from the user's click; without one, sign-in isn't allowed (e.g. during a chat turn). */
    private popup: Window | null = null,
  ) {}

  get redirectUrl() {
    return OAUTH_CALLBACK()
  }
  get clientMetadata(): OAuthClientMetadata {
    return { client_name: "Prism", redirect_uris: [OAUTH_CALLBACK()], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" }
  }
  state() {
    const state = crypto.randomUUID()
    writeStore(this.id, { state })
    return state
  }
  clientInformation() {
    return readStore(this.id).client
  }
  saveClientInformation(client: OAuthClientInformationMixed) {
    writeStore(this.id, { client })
  }
  tokens() {
    return readStore(this.id).tokens
  }
  saveTokens(tokens: OAuthTokens) {
    writeStore(this.id, { tokens })
  }
  saveCodeVerifier(verifier: string) {
    writeStore(this.id, { verifier })
  }
  codeVerifier() {
    const v = readStore(this.id).verifier
    if (!v) throw new Error("Sign-in expired. Try again.")
    return v
  }
  invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery") {
    if (scope === "all") signOutConnector(this.id)
    else if (scope === "client") writeStore(this.id, { client: undefined })
    else if (scope === "tokens") writeStore(this.id, { tokens: undefined })
    else if (scope === "verifier") writeStore(this.id, { verifier: undefined })
  }
  redirectToAuthorization(url: URL) {
    if (!this.popup || this.popup.closed) throw new Error("Sign in again from Connectors.")
    const popup = this.popup
    popup.location.href = url.toString()
    this.code = new Promise((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        if (e.origin !== location.origin || e.data?.type !== "das-oauth") return
        cleanup()
        if (e.data.error) reject(new Error(`Sign-in failed: ${e.data.error_description ?? e.data.error}`))
        else resolve({ code: e.data.code, state: e.data.state })
      }
      const timer = window.setInterval(() => {
        if (popup.closed) {
          cleanup()
          reject(new Error("Sign-in window was closed before finishing."))
        }
      }, 500)
      const cleanup = () => {
        window.removeEventListener("message", onMessage)
        clearInterval(timer)
      }
      window.addEventListener("message", onMessage)
    })
  }
  /** Resolves with the authorization code once the pop-up reaches the callback page. */
  async authorizationCode() {
    if (!this.code) throw new Error("Sign-in didn't start.")
    const { code, state } = await this.code
    if (state && state !== readStore(this.id).state) throw new Error("Sign-in response didn't match. Try again.")
    return code
  }
}

function transportFor(c: Connector, provider?: OAuthClientProvider) {
  const headers: Record<string, string> = c.auth !== "oauth" && c.token ? { Authorization: `Bearer ${c.token}` } : {}
  const url = new URL(c.url)
  const opts = { requestInit: { headers }, fetch: relayFetch, authProvider: c.auth === "oauth" ? (provider ?? new BrowserOAuthProvider(c.id)) : undefined }
  return c.transport === "sse" ? new SSEClientTransport(url, opts) : new StreamableHTTPClientTransport(url, opts)
}

function friendlyConnectError(e: unknown, c: Connector) {
  const msg = (e as Error).message ?? String(e)
  if (e instanceof UnauthorizedError || /401|unauthor/i.test(msg)) return new Error(c.auth === "oauth" ? `Sign in to ${c.name} again.` : "The server rejected the token. Paste a valid access token.")
  if (/403/.test(msg)) return new Error(c.auth === "oauth" ? `${c.name} refused access. Check your plan and sign in again.` : "The server rejected the token. Paste a valid access token.")
  if (/fetch|network|cors/i.test(msg)) return new Error("Couldn't reach the server from the browser. Check the URL, and that the server allows requests from this site (CORS).")
  return new Error(msg)
}

/** Connect with stored credentials. Never opens a sign-in window. */
export async function connect(c: Connector): Promise<Client> {
  const client = new Client({ name: "prism", version: "0.1.0" })
  try {
    await client.connect(transportFor(c))
  } catch (e) {
    throw friendlyConnectError(e, c)
  }
  return client
}

/**
 * Sign in to an OAuth connector. Pass a pop-up opened directly from the click handler
 * (browsers block pop-ups opened after an await). Returns the connector's tools.
 */
export async function signInConnector(c: Connector, popup: Window | null) {
  if (!popup) throw new Error("Your browser blocked the sign-in window. Allow pop-ups for this site and try again.")
  const provider = new BrowserOAuthProvider(c.id, popup)
  const first = new Client({ name: "prism", version: "0.1.0" })
  const transport = transportFor(c, provider)
  try {
    await first.connect(transport)
    popup.close() // already signed in
    return listToolsAndClose(first)
  } catch (e) {
    if (!(e instanceof UnauthorizedError)) {
      popup.close()
      throw friendlyConnectError(e, c)
    }
  }
  try {
    const code = await provider.authorizationCode()
    await (transport as StreamableHTTPClientTransport).finishAuth(code)
  } finally {
    if (!popup.closed) popup.close()
  }
  return listToolsAndClose(await connect(c))
}

async function listToolsAndClose(client: Client) {
  try {
    const { tools } = await client.listTools()
    return tools.map((t) => ({ name: t.name, description: t.description }))
  } finally {
    client.close().catch(() => {})
  }
}

/** Connect, list tools, disconnect. */
export async function testConnector(c: Connector) {
  return listToolsAndClose(await connect(c))
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 20)

/** Open every enabled connector and expose its tools to the agent. Returns a close() to call when the turn ends. */
export async function connectorTools(connectors: Connector[]): Promise<{ tools: Record<string, Tool>; close: () => void; failed: string[] }> {
  const tools: Record<string, Tool> = {}
  const clients: Client[] = []
  const failed: string[] = []
  await Promise.all(
    connectors
      .filter((c) => c.enabled && c.status === "ok")
      .map(async (c) => {
        try {
          const client = await connect(c)
          clients.push(client)
          const { tools: list } = await client.listTools()
          for (const t of list) {
            const key = `${slug(c.catalogId ?? c.name)}__${t.name}`.slice(0, 64)
            tools[key] = tool({
              description: `[${c.name}] ${t.description ?? t.name}`,
              inputSchema: jsonSchema((t.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0]),
              execute: async (args) => {
                const res = await client.callTool({ name: t.name, arguments: args as Record<string, unknown> })
                const content = (res.content ?? []) as { type: string; text?: string; data?: string; mimeType?: string; uri?: string; name?: string }[]
                const text = content
                  .map((p) => (p.type === "text" ? p.text : p.type === "resource_link" ? `[${p.name ?? "link"}](${p.uri})` : p.type === "image" ? "" : `[${p.type}]`))
                  .filter(Boolean)
                  .join("\n")
                // Screens come back as images; pass them through so the model can actually look at them.
                const images = content.filter((p) => p.type === "image" && p.data).slice(0, 8).map((p) => ({ data: p.data!, mediaType: p.mimeType ?? "image/png" }))
                return { text: (res.isError ? "Error: " : "") + (text || (images.length ? "" : "Done.")).slice(0, 20000), images }
              },
              toModelOutput: (out: { text: string; images: { data: string; mediaType: string }[] }) => ({
                type: "content",
                value: [...(out.text ? [{ type: "text" as const, text: out.text }] : []), ...out.images.map((i) => ({ type: "media" as const, data: i.data, mediaType: i.mediaType }))],
              }),
            })
          }
        } catch {
          failed.push(c.name)
        }
      }),
  )
  return { tools, failed, close: () => clients.forEach((c) => c.close().catch(() => {})) }
}
