import { useId, useRef, useState } from "react"
import { AlertCircle, Check, ChevronDown, LogIn, LogOut, Loader2, Plus, RefreshCw, Search, Trash2, Wrench } from "@/components/ui/icons"
import { toast } from "sonner"
import { motion } from "motion/react"
import type { Connector } from "@/lib/types"
import { uid, useStore } from "@/lib/store"
import { CONNECTOR_CATALOG, type ConnectorCategory, signInConnector, signOutConnector, testConnector } from "@/lib/mcp"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "@/lib/ease"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageHeader, Section } from "./page-header"
import { AgentDisclosure } from "@/components/agents/agent-disclosure"
import { BrandLogo } from "@/components/brand-logo"

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

type Tab = "directory" | "custom"

export function ConnectorsPage() {
  const connectors = useStore((s) => s.connectors)
  const [editing, setEditing] = useState<Partial<Connector> | null>(null)
  const [tab, setTab] = useState<Tab>("directory")
  const [category, setCategory] = useState<ConnectorCategory | "All">("All")
  const [query, setQuery] = useState("")
  const added = new Set(connectors.map((c) => c.catalogId).filter(Boolean))
  const categories = ["All", ...new Set(CONNECTOR_CATALOG.map((k) => k.category))] as (ConnectorCategory | "All")[]
  const catalog = CONNECTOR_CATALOG.filter((k) => (category === "All" || k.category === category) && `${k.name} ${k.description}`.toLowerCase().includes(query.toLowerCase()))
  const live = connectors.filter((c) => c.status === "ok" && c.enabled).length
  const tabsRef = useRef<HTMLDivElement>(null)
  const goCustom = () => {
    setTab("custom")
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-6 pb-16 md:px-10">
        <PageHeader
          title="Connectors"
          description="Connect MCP servers so the agent can read from and act in your other tools: pull a spec from Notion, file a Linear issue from a crit, or read variables from Figma."
          action={
            <Button className="rounded-full" onClick={goCustom}>
              <Plus /> Custom MCP
            </Button>
          }
        />

        <Section
          title="Connected"
          description={connectors.length ? `${live} of ${connectors.length} available to the agent in every conversation.` : undefined}
        >
          {connectors.length === 0 ? (
            <div className="bg-muted/40 text-muted-foreground flex items-center gap-3 rounded-2xl border border-dashed px-5 py-5 text-[13.5px]">
              <span className="flex -space-x-2">
                {["figma", "linear", "notion"].map((id) => (
                  <BrandLogo key={id} of={{ catalogId: id }} size={30} className="ring-background ring-2" />
                ))}
              </span>
              Nothing connected yet. Pick one from the directory below, or add your own MCP server.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {connectors.map((c) => (
                <ConnectorRow key={c.id} c={c} onEdit={() => setEditing(c)} />
              ))}
            </div>
          )}
        </Section>

        <section ref={tabsRef} className="scroll-mt-6">
          <div className="mb-5 flex flex-wrap items-center gap-3 border-b">
            {(["directory", "custom"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn("-mb-px border-b-2 px-1 pb-2.5 text-[15px] font-semibold transition-colors", tab === t ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground border-transparent")}
              >
                {t === "directory" ? "Directory" : "Custom MCP"}
              </button>
            ))}
            {tab === "directory" && (
              <div className="relative mb-2 ml-auto">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search connectors" className="h-9 w-56 rounded-lg pl-8" aria-label="Search connectors" />
              </div>
            )}
          </div>

          {tab === "directory" ? (
            <>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {categories.map((k) => (
                  <button
                    key={k}
                    onClick={() => setCategory(k)}
                    className={cn("h-8 rounded-full border px-3 text-[13px] font-medium transition-colors", category === k ? "bg-foreground text-background border-transparent" : "bg-background hover:bg-accent")}
                  >
                    {k}
                  </button>
                ))}
              </div>
              {catalog.length === 0 ? (
                <div className="text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-[13.5px]">
                  Nothing here matches. You can still{" "}
                  <button className="text-foreground font-medium underline underline-offset-2" onClick={() => setTab("custom")}>
                    add it as a custom MCP
                  </button>
                  .
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {catalog.map((k, i) => (
                    <motion.div
                      key={k.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.03 }}
                      className="bg-card flex flex-col rounded-2xl border p-4 shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        <BrandLogo of={{ catalogId: k.id, name: k.name, url: k.url }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold">{k.name}</div>
                          <div className="text-muted-foreground text-[12px]">
                            {k.category} · {k.auth === "oauth" ? "Sign in" : "Token"} · {k.transport === "sse" ? "SSE" : "HTTP"}
                          </div>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-3 flex-1 text-[13px] leading-snug">{k.description}</p>
                      <div className="mt-4">
                        {added.has(k.id) ? (
                          <span className="text-ok inline-flex h-8 items-center gap-1 text-[12.5px] font-medium">
                            <Check className="size-3.5" /> Added
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setEditing({ name: k.name, url: k.url, transport: k.transport, auth: k.auth, catalogId: k.id })}>
                            <Plus /> Connect
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-card max-w-[640px] rounded-2xl border p-5 shadow-xs">
              <div className="mb-4">
                <div className="text-[15px] font-semibold">Add your own MCP server</div>
                <p className="text-muted-foreground mt-0.5 text-[13px]">Any server over Streamable HTTP or SSE. Prism connects, lists its tools and offers them to the agent.</p>
              </div>
              <ConnectorForm key={connectors.length} value={{ transport: "http" }} onDone={() => setTab("directory")} />
            </div>
          )}
        </section>

        <p className="text-muted-foreground text-[12.5px] leading-relaxed">
          Connectors run from your browser, so the server must allow requests from this site (CORS). Tokens are stored in this browser only and sent only to that server. Logos from Simple Icons.
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
        <BrandLogo of={c} />
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

/** Why a connector isn't working, in a few words. */
export function errorReason(c: Connector) {
  const e = c.error ?? ""
  if (/401|403|unauthori[sz]ed|forbidden|invalid.?token|expired/i.test(e)) return c.auth === "oauth" ? "Needs sign-in" : "Token rejected"
  if (/cors|failed to fetch|networkerror|load failed|err_/i.test(e)) return "Can't reach server"
  if (/404|not found/i.test(e)) return "Wrong URL"
  return "Can't connect"
}

function StatusBadge({ c }: { c: Connector }) {
  const [label, cls] =
    c.status === "ok"
      ? c.enabled
        ? [`Connected · ${c.tools.length} tool${c.tools.length === 1 ? "" : "s"}`, "border-ok/30 bg-ok/10 text-ok"]
        : ["Paused", "text-muted-foreground"]
      : c.status === "error"
        ? [errorReason(c), "border-destructive/30 bg-destructive/10 text-destructive"]
        : c.status === "checking"
          ? ["Checking…", "border-pin/30 bg-pin/10 text-pin"]
          : [c.auth === "oauth" ? "Needs sign-in" : "Not tested", "text-muted-foreground"]
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", cls)}>
      <span className={cn("size-1.5 rounded-full bg-current", c.status === "checking" && "animate-pulse")} aria-hidden />
      {label}
    </span>
  )
}

function ConnectorDialog({ value, onClose }: { value: Partial<Connector> | null; onClose: () => void }) {
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {value && <BrandLogo of={value} size={36} />}
            <div>
              <DialogTitle>{value?.id ? `Edit ${value.name}` : value?.name ? `Connect ${value.name}` : "Add connector"}</DialogTitle>
              <DialogDescription className="mt-0.5">Any MCP server over Streamable HTTP or SSE. We'll connect and list its tools.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {value && <ConnectorForm value={value} onDone={onClose} onCancel={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function ConnectorForm({ value, onDone, onCancel }: { value: Partial<Connector>; onDone: () => void; onCancel?: () => void }) {
  const upsert = useStore((s) => s.upsertConnector)
  const [draft, setDraft] = useState<Partial<Connector>>({})
  const [saving, setSaving] = useState(false)
  const fid = useId()
  const current = { ...value, ...draft }
  const set = (p: Partial<Connector>) => setDraft((d) => ({ ...d, ...p }))
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
    setDraft({})
    onDone()
  }
  const note = CONNECTOR_CATALOG.find((k) => k.id === current.catalogId)?.note
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) save()
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fid}-name`}>Name</Label>
        <Input id={`${fid}-name`} value={current.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="Design tokens server" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fid}-url`}>Server URL</Label>
        <Input id={`${fid}-url`} value={current.url ?? ""} onChange={(e) => set({ url: e.target.value })} placeholder="https://mcp.example.com/mcp" className="font-mono text-[12.5px]" />
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
          <Label htmlFor={`${fid}-token`}>Access token</Label>
          <Input id={`${fid}-token`} type="password" value={current.token ?? ""} onChange={(e) => set({ token: e.target.value })} placeholder="Optional" className="font-mono text-[12.5px]" autoComplete="off" />
          <p className="text-muted-foreground text-[12px]">{note ?? "Sent as a Bearer token in the Authorization header."}</p>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!valid || saving}>
          {saving && <Loader2 className="animate-spin" />}
          {oauth ? (value?.id ? "Save and sign in" : "Add and sign in") : value?.id ? "Save and test" : "Add and test"}
        </Button>
      </div>
    </form>
  )
}
