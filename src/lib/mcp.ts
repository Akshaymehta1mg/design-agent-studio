import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { jsonSchema, tool, type Tool } from "ai"
import type { Connector } from "./types"

/** Remote MCP servers the studio knows about. Most need an access token (or OAuth done elsewhere). */
export const CONNECTOR_CATALOG: { id: string; name: string; description: string; url: string; transport: "http" | "sse"; note?: string }[] = [
  { id: "figma-desktop", name: "Figma (desktop)", description: "Selection, variables and components from the Figma desktop app's local Dev Mode server.", url: "http://127.0.0.1:3845/mcp", transport: "http", note: "Turn on the Dev Mode MCP server in Figma's preferences first." },
  { id: "figma", name: "Figma (remote)", description: "Read design context and frames from files you can open.", url: "https://mcp.figma.com/mcp", transport: "http", note: "Needs an OAuth access token." },
  { id: "linear", name: "Linear", description: "Read and create issues and projects so crits turn into tickets.", url: "https://mcp.linear.app/mcp", transport: "http", note: "Needs a Linear API key or OAuth token." },
  { id: "notion", name: "Notion", description: "Pull PRDs and research notes into the conversation.", url: "https://mcp.notion.com/mcp", transport: "http", note: "Needs an OAuth token." },
  { id: "github", name: "GitHub", description: "Look up components and tokens in your design system repo.", url: "https://api.githubcopilot.com/mcp/", transport: "http", note: "Needs a GitHub personal access token." },
  { id: "atlassian", name: "Jira & Confluence", description: "Read specs and file issues in Atlassian products.", url: "https://mcp.atlassian.com/v1/sse", transport: "sse", note: "Needs an OAuth token." },
]

function transportFor(c: Connector) {
  const headers: Record<string, string> = c.token ? { Authorization: `Bearer ${c.token}` } : {}
  const url = new URL(c.url)
  return c.transport === "sse" ? new SSEClientTransport(url, { requestInit: { headers } }) : new StreamableHTTPClientTransport(url, { requestInit: { headers } })
}

export async function connect(c: Connector): Promise<Client> {
  const client = new Client({ name: "design-agent-studio", version: "0.1.0" })
  try {
    await client.connect(transportFor(c))
  } catch (e) {
    const msg = (e as Error).message ?? String(e)
    if (/fetch|network|cors/i.test(msg)) throw new Error("Couldn't reach the server from the browser. Check the URL, and that the server allows requests from this site (CORS).")
    if (/401|403|unauthor/i.test(msg)) throw new Error("The server rejected the token. Paste a valid access token.")
    throw new Error(msg)
  }
  return client
}

/** Connect, list tools, disconnect. */
export async function testConnector(c: Connector) {
  const client = await connect(c)
  try {
    const { tools } = await client.listTools()
    return tools.map((t) => ({ name: t.name, description: t.description }))
  } finally {
    client.close().catch(() => {})
  }
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
            const key = `${slug(c.name)}__${t.name}`.slice(0, 64)
            tools[key] = tool({
              description: `[${c.name}] ${t.description ?? t.name}`,
              inputSchema: jsonSchema((t.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0]),
              execute: async (args) => {
                const res = await client.callTool({ name: t.name, arguments: args as Record<string, unknown> })
                const content = (res.content ?? []) as { type: string; text?: string }[]
                const text = content.map((p) => (p.type === "text" ? p.text : `[${p.type}]`)).join("\n")
                return (res.isError ? "Error: " : "") + (text || "Done.").slice(0, 20000)
              },
            })
          }
        } catch {
          failed.push(c.name)
        }
      }),
  )
  return { tools, failed, close: () => clients.forEach((c) => c.close().catch(() => {})) }
}
