import { useState } from "react"
import { AlertCircle, Check, ChevronDown, LogIn, LogOut, Loader2, Plug, Plus, RefreshCw, Trash2, Wrench } from "lucide-react"
import { toast } from "sonner"
import { motion } from "motion/react"
import type { Connector } from "@/lib/types"
import { uid, useStore } from "@/lib/store"
import { CONNECTOR_CATALOG, signInConnector, signOutConnector, testConnector } from "@/lib/mcp"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "@/lib/ease"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageHeader, Section } from "./page-header"
import { AgentDisclosure } from "@/components/agents/agent-disclosure"

export async function checkConnector(id: string) {
  const { connectors, patchConnector } = useStore.getState()
  const c = connectors.find((x) => x.id === id)
  if (!c) return
  patchConnector(id, { status: "checking", error: undefined })
  try {
    const tools = await testConnector(c)
    patchConnector(id, { status: "ok", tools })
    toast.success(`${c.name} connected`, { description: `${tools.length} tool${tools.length === 1 ? "" : "s"} available to the agent` })
  } catch (e) {
    patchConnector(id, { status: "error", error: (e as Error).message, tools: [] })
  }
}

/** Open the sign-in pop-up synchronously (call from a click handler), then finish sign-in and list tools. */
export async function signIn(id: string) {
  const popup = window.open("about:blank", "das-oauth", "width=520,height=720")
  const { connectors, patchConnector } = useStore.getState()
  const c = connectors.find((x) => x.id === id)
  if (!c) return popup?.close()
  patchConnector(id, { status: "checking", error: undefined })
  try {
    const tools = await signInConnector(c, popup)
    patchConnector(id, { status: "ok", tools })
    toast.success(`${c.name} connected`, { description: `${tools.length} tool${tools.length === 1 ? "" : "s"} available to the agent` })
  } catch (e) {
    patchConnector(id, { status: "error", error: (e as Error).message, tools: [] })
  }
}

function Monogram({ name }: { name: string }) {
  return <span className="bg-muted text-foreground grid size-10 shrink-0 place-items-center rounded-xl border text-[14px] font-bold">{name.slice(0, 1).toUpperCase()}</span>
}

export function ConnectorsPage() {
  const connectors = useStore((s) => s.connectors)
  const [editing, setEditing] = useState<Partial<Connector> | null>(null)
  const added = new Set(connectors.map((c) => c.catalogId).filter(Boolean))
  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto flex max-w-[980px] flex-col gap-10 px-6 pb-16 md:px-10">
        <PageHeader
          title="Connectors"
          description="Connect MCP servers so the agent can read from and act in your other tools: pull a spec from Notion, file a Linear issue from a crit, or read variables from Figma."
          action={
            <Button className="rounded-full" onClick={() => setEditing({ transport: "http" })}>
              <Plus /> Add connector
            </Button>
          }
        />

        <Section title="Your connectors" description={connectors.length ? "Enabled connectors are available in every conversation." : undefined}>
          {connectors.length === 0 ? (
            <button onClick={() => setEditing({ transport: "http" })} className="hover:bg-muted/50 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors">
              <Plug className="text-muted-foreground size-5" />
              <span className="text-[14px] font-medium">No connectors yet</span>
              <span className="text-muted-foreground max-w-md text-[13px]">Add any MCP server that speaks Streamable HTTP or SSE, or pick one of the suggestions below.</span>
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              {connectors.map((c) => (
                <ConnectorRow key={c.id} c={c} onEdit={() => setEditing(c)} />
              ))}
            </div>
          )}
        </Section>

        <Section title="Suggested" description="Remote MCP servers that work well with design work. Most need an access token.">
          <div className="grid gap-3 sm:grid-cols-2">
            {CONNECTOR_CATALOG.map((k, i) => (
              <motion.div key={k.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.03 }} className="bg-card flex gap-3 rounded-2xl border p-4 shadow-xs">
                <Monogram name={k.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{k.name}</span>
                    <Badge variant="secondary" className="text-[10.5px] font-normal uppercase">
                      {k.transport === "sse" ? "SSE" : "HTTP"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">{k.description}</p>
                  <div className="mt-3">
                    {added.has(k.id) ? (
                      <span className="text-ok inline-flex items-center gap-1 text-[12.5px] font-medium">
                        <Check className="size-3.5" /> Added
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setEditing({ name: k.name, url: k.url, transport: k.transport, auth: k.auth, catalogId: k.id })}>
                        <Plus /> Add
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        <p className="text-muted-foreground text-[12.5px] leading-relaxed">
          Connectors run from your browser, so the server must allow requests from this site (CORS). Tokens are stored in this browser only and sent only to that server.
        </p>
      </div>
      <ConnectorDialog value={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function ConnectorRow({ c, onEdit }: { c: Connector; onEdit: () => void }) {
  const patch = useStore((s) => s.patchConnector)
  const del = useStore((s) => s.deleteConnector)
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card rounded-2xl border shadow-xs">
      <div className="flex items-center gap-3 p-4">
        <Monogram name={c.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="truncate text-[14px] font-semibold hover:underline">
              {c.name}
            </button>
            <StatusBadge c={c} />
          </div>
          <div className="text-muted-foreground truncate font-mono text-[11.5px]">{c.url}</div>
        </div>
        {c.status === "ok" && (
          <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground hidden items-center gap-1 text-[12.5px] sm:inline-flex">
            <Wrench className="size-3.5" />
            {c.tools.length} tool{c.tools.length === 1 ? "" : "s"}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
        )}
        {c.auth === "oauth" && c.status !== "ok" ? (
          <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={() => signIn(c.id)} disabled={c.status === "checking"}>
            {c.status === "checking" ? <Loader2 className="animate-spin" /> : <LogIn />} Sign in
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="size-8" onClick={() => checkConnector(c.id)} disabled={c.status === "checking"} aria-label="Test connection">
            {c.status === "checking" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        )}
        {c.auth === "oauth" && c.status === "ok" && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-8"
            onClick={() => {
              signOutConnector(c.id)
              patch(c.id, { status: "untested", tools: [], error: undefined })
            }}
            aria-label={`Sign out of ${c.name}`}
          >
            <LogOut />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-8"
          onClick={() => {
            signOutConnector(c.id)
            del(c.id)
          }}
          aria-label={`Remove ${c.name}`}
        >
          <Trash2 />
        </Button>
        <Switch checked={c.enabled} onCheckedChange={(v) => patch(c.id, { enabled: v })} aria-label="Enabled" />
      </div>
      {c.status === "error" && (
        <div className="text-destructive flex gap-2 border-t px-4 py-3 text-[12.5px]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {c.error}
        </div>
      )}
      <AgentDisclosure open={open && c.status === "ok"}>
        <div className="flex flex-wrap gap-1.5 border-t px-4 py-3">
          {c.tools.map((t) => (
            <span key={t.name} title={t.description} className="bg-muted rounded-md px-2 py-1 font-mono text-[11px]">
              {t.name}
            </span>
          ))}
        </div>
      </AgentDisclosure>
    </div>
  )
}

function StatusBadge({ c }: { c: Connector }) {
  const map = {
    ok: ["Connected", "border-ok/30 bg-ok/10 text-ok"],
    error: ["Can't connect", "border-destructive/30 bg-destructive/10 text-destructive"],
    checking: ["Checking", "border-pin/30 bg-pin/10 text-pin"],
    untested: ["Not tested", "text-muted-foreground"],
  } as const
  const [label, cls] = map[c.status]
  return <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", cls, !c.enabled && c.status === "ok" && "opacity-60")}>{c.enabled || c.status !== "ok" ? label : "Off"}</span>
}

function ConnectorDialog({ value, onClose }: { value: Partial<Connector> | null; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertConnector)
  const [draft, setDraft] = useState<Partial<Connector>>({})
  const [saving, setSaving] = useState(false)
  const open = !!value
  const current = { ...value, ...draft }
  const set = (p: Partial<Connector>) => setDraft((d) => ({ ...d, ...p }))
  const close = () => {
    setDraft({})
    onClose()
  }
  const valid = !!current.name?.trim() && /^https?:\/\//.test(current.url ?? "")
  const oauth = current.auth === "oauth"
  const save = async () => {
    const c: Connector = {
      id: current.id ?? uid("mcp_"),
      name: current.name!.trim(),
      url: current.url!.trim(),
      transport: current.transport ?? "http",
      auth: current.auth ?? "token",
      token: oauth ? undefined : current.token?.trim() || undefined,
      enabled: current.enabled ?? true,
      status: "untested",
      tools: [],
      catalogId: current.catalogId,
      addedAt: current.addedAt ?? Date.now(),
    }
    upsert(c)
    setSaving(true)
    // OAuth: signIn opens its pop-up before any await, so this must stay the first call.
    await (oauth ? signIn(c.id) : checkConnector(c.id))
    setSaving(false)
    close()
  }
  const note = CONNECTOR_CATALOG.find((k) => k.id === current.catalogId)?.note
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{value?.id ? "Edit connector" : "Add connector"}</DialogTitle>
          <DialogDescription>Any MCP server over Streamable HTTP or SSE. We'll connect and list its tools.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) save()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-name">Name</Label>
            <Input id="mcp-name" value={current.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="Linear" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-url">Server URL</Label>
            <Input id="mcp-url" value={current.url ?? ""} onChange={(e) => set({ url: e.target.value })} placeholder="https://mcp.example.com/mcp" className="font-mono text-[12.5px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Transport</Label>
            <div className="bg-muted grid grid-cols-2 rounded-lg p-0.5">
              {(["http", "sse"] as const).map((t) => (
                <button type="button" key={t} onClick={() => set({ transport: t })} className={cn("rounded-md py-1.5 text-[13px] font-medium", (current.transport ?? "http") === t ? "bg-background shadow-xs" : "text-muted-foreground")}>
                  {t === "http" ? "Streamable HTTP" : "SSE"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Access</Label>
            <div className="bg-muted grid grid-cols-2 rounded-lg p-0.5">
              {(["oauth", "token"] as const).map((t) => (
                <button type="button" key={t} onClick={() => set({ auth: t })} className={cn("rounded-md py-1.5 text-[13px] font-medium", (current.auth ?? "token") === t ? "bg-background shadow-xs" : "text-muted-foreground")}>
                  {t === "oauth" ? "Sign in with browser" : "Access token"}
                </button>
              ))}
            </div>
          </div>
          {oauth ? (
            <p className="text-muted-foreground -mt-2 text-[12px]">{note ?? "A sign-in window opens. Your session is stored in this browser only."}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mcp-token">Access token</Label>
              <Input id="mcp-token" type="password" value={current.token ?? ""} onChange={(e) => set({ token: e.target.value })} placeholder="Optional" className="font-mono text-[12.5px]" autoComplete="off" />
              <p className="text-muted-foreground text-[12px]">{note ?? "Sent as a Bearer token in the Authorization header."}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving && <Loader2 className="animate-spin" />}
              {oauth ? (value?.id ? "Save and sign in" : "Add and sign in") : value?.id ? "Save and test" : "Add and test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
