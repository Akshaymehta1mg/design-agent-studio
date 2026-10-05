import { useState } from "react"
import { Check, Eye, EyeOff, Loader2, RefreshCw, ExternalLink, Trash2, AlertCircle } from "@/components/ui/icons"
import { toast } from "sonner"
import { useStore, defaultSettings, discardPendingWrites } from "@/lib/store"
import { checkServer, useServer, viaServer } from "@/lib/server"
import { fetchModels, pickDefaultModel, PROVIDERS, PROVIDER_ORDER, type KeyedProvider } from "@/lib/providers"
import { PageHeader } from "@/components/pages/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export async function connectProvider(p: KeyedProvider, quiet = false) {
  const { settings, patchProvider, patchSettings } = useStore.getState()
  const state = settings.providers[p]
  const server = p !== "custom" && viaServer(p)
  if (!state.apiKey.trim() && p !== "custom" && !server) return
  patchProvider(p, { status: "checking", error: undefined })
  try {
    const models = await fetchModels(p, state)
    if (!models.length) throw new Error("The key works, but no chat models came back.")
    patchProvider(p, { status: "ok", models, fetchedAt: Date.now(), server })
    // Pick a model automatically the first time a key connects.
    if (!useStore.getState().settings.selectedModel.id) {
      const m = pickDefaultModel(models)
      if (m) patchSettings({ selectedModel: { provider: p, id: m.id, name: m.name } })
    }
    if (!quiet) toast.success(`${PROVIDERS[p].vendor} connected`, { description: `${models.length} models available` })
  } catch (e) {
    patchProvider(p, { status: "error", error: (e as Error).message, models: [] })
  }
}

function SecretInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} className="pr-16 font-mono text-[12.5px]" />
      <button type="button" className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 text-[12px]" onClick={() => setShow(!show)}>
        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {show ? "Hide" : "Show"}
      </button>
    </div>
  )
}

export function SettingsPage() {
  const server = useServer()
  const serverHas = (id: KeyedProvider) => id !== "custom" && !!server.providers[id] && server.authorized
  const settings = useStore((s) => s.settings)
  const patchProvider = useStore((s) => s.patchProvider)
  const patchSettings = useStore((s) => s.patchSettings)
  const [tab, setTab] = useState<KeyedProvider>("anthropic")
  const p = settings.providers[tab]

  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 pb-16 md:px-10 [&>section]:max-w-[760px]">
        <PageHeader title="Settings" description="Keys stay in this browser and go only to the provider you call. Nothing is stored on a server." />

        {server.deployed && <DeploymentCard />}

        <Card title="Profile">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Your name</Label>
            <Input id="profile-name" value={settings.profileName ?? ""} onChange={(e) => patchSettings({ profileName: e.target.value })} placeholder="Used in the greeting on Home" className="max-w-sm" />
          </div>
        </Card>

        <Card title="AI provider" description="Add a key and the model menu fills with every model it can use.">
          <Tabs value={tab} onValueChange={(v) => setTab(v as KeyedProvider)}>
            <TabsList className="grid h-auto w-full grid-cols-3 sm:grid-cols-6">
              {PROVIDER_ORDER.map((id) => (
                <TabsTrigger key={id} value={id} className="relative flex h-auto min-w-0 flex-col items-start gap-0 overflow-hidden px-2 py-1.5 text-left">
                  <span className="max-w-full truncate text-[12.5px] font-semibold">{PROVIDERS[id].name}</span>
                  <span className="text-muted-foreground max-w-full truncate text-[10.5px] font-normal">{PROVIDERS[id].vendor}</span>
                  {settings.providers[id].status === "ok" && <span className="bg-ok absolute top-1.5 right-1.5 size-1.5 rounded-full" />}
                </TabsTrigger>
              ))}
            </TabsList>
            {PROVIDER_ORDER.map((id) => (
              <TabsContent key={id} value={id} className="mt-3 flex flex-col gap-3">
                {id === "custom" && (
                  <div className="grid grid-cols-[1fr_140px] gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="custom-base">Base URL</Label>
                      <Input id="custom-base" value={p.baseUrl ?? ""} onChange={(e) => patchProvider("custom", { baseUrl: e.target.value, status: "empty" })} placeholder="https://api.groq.com/openai/v1" className="font-mono text-[12.5px]" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="custom-label">Name</Label>
                      <Input id="custom-label" value={p.label ?? ""} onChange={(e) => patchProvider("custom", { label: e.target.value })} placeholder="Groq" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`key-${id}`}>{PROVIDERS[id].vendor} API key</Label>
                    {PROVIDERS[id].keyUrl && (
                      <a href={PROVIDERS[id].keyUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[12px]">
                        Get a key <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SecretInput id={`key-${id}`} value={p.apiKey} placeholder={PROVIDERS[id].placeholder} onChange={(v) => patchProvider(id, { apiKey: v, status: v ? "empty" : "empty", error: undefined })} />
                    </div>
                    <Button onClick={() => connectProvider(id)} disabled={p.status === "checking" || (!p.apiKey.trim() && id !== "custom" && !serverHas(id))}>
                      {p.status === "checking" ? <Loader2 className="animate-spin" /> : p.status === "ok" ? <RefreshCw /> : null}
                      {p.status === "ok" ? "Refresh" : "Connect"}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-[12px]">
                    {serverHas(id) && !p.apiKey.trim() ? "This deployment provides a key, so you can leave this empty. Add your own to use it instead." : PROVIDERS[id].hint}
                  </p>
                </div>
                <PromptSize id={id} />
                {p.status === "error" && (
                  <div className="border-destructive/30 bg-destructive/5 flex gap-2 rounded-lg border p-2.5 text-[12.5px]">
                    <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                    <span>{p.error}</span>
                  </div>
                )}
                {p.status === "ok" && (
                  <div className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Check className="text-ok size-4" /> Connected · {p.models.length} models
                      </span>
                      <button
                        className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-[12px]"
                        onClick={() => {
                          patchProvider(id, { ...defaultSettings.providers[id] })
                          if (settings.selectedModel.provider === id) patchSettings({ selectedModel: defaultSettings.selectedModel })
                        }}
                      >
                        <Trash2 className="size-3.5" /> Remove key
                      </button>
                    </div>
                    <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto" data-scrollable>
                      {p.models.slice(0, 60).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => patchSettings({ selectedModel: { provider: id, id: m.id, name: m.name } })}
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] transition-colors",
                            settings.selectedModel.provider === id && settings.selectedModel.id === m.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent",
                          )}
                        >
                          {m.id}
                        </button>
                      ))}
                      {p.models.length > 60 && <span className="text-muted-foreground px-1 text-[11px]">+{p.models.length - 60} more in the model menu</span>}
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
          <div className="text-muted-foreground flex items-center gap-2 text-[12.5px]">
            Using
            <Badge variant="secondary" className="font-mono text-[11px]">
              {settings.selectedModel.id || "No model selected"}
            </Badge>
          </div>
        </Card>

        <Card title="Figma">
          <div className="flex items-center justify-between">
            <Label htmlFor="figma-token">Personal access token</Label>
            <a href="https://www.figma.com/developers/api#access-tokens" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[12px]">
              How to create one <ExternalLink className="size-3" />
            </a>
          </div>
          <SecretInput id="figma-token" value={settings.figmaToken} onChange={(v) => patchSettings({ figmaToken: v })} placeholder="figd_…" />
          <p className="text-muted-foreground text-[12px] leading-snug">
            In Figma, go to Settings → Security → Personal access tokens. Give it <strong className="text-foreground font-medium">File content: read</strong> and <strong className="text-foreground font-medium">Comments: write</strong> so the agent can read frames and leave comments.
          </p>
        </Card>

        <Card title="Voice and appearance">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="speak" className="font-normal">
              Read replies aloud
            </Label>
            <Switch id="speak" checked={settings.speakReplies} onCheckedChange={(v) => patchSettings({ speakReplies: v })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">Theme</span>
            <div className="bg-muted flex rounded-lg p-0.5">
              {(["system", "light", "dark"] as const).map((t) => (
                <button key={t} onClick={() => patchSettings({ theme: t })} className={cn("rounded-md px-2.5 py-1 text-[12.5px] capitalize", settings.theme === t ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Data" description="Projects, settings and keys live in this browser's storage.">
          <DataControls />
        </Card>
      </div>
    </div>
  )
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card flex flex-col gap-4 rounded-2xl border p-5 shadow-xs">
      <div>
        <h2 className="font-sans text-[15.5px] font-semibold tracking-normal">{title}</h2>
        {description && <p className="text-muted-foreground mt-0.5 text-[13px]">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function DataControls() {
  const [confirm, setConfirm] = useState(false)
  const reset = async () => {
    discardPendingWrites()
    try {
      const { clear } = await import("idb-keyval")
      await clear()
    } catch {
      /* storage unavailable */
    }
    location.reload()
  }
  return confirm ? (
    <div className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-[13px]">
      <span className="flex-1">This deletes every project, design system, connector and key in this browser. It can't be undone.</span>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        Cancel
      </Button>
      <Button variant="destructive" size="sm" onClick={reset}>
        Delete everything
      </Button>
    </div>
  ) : (
    <Button variant="outline" className="text-destructive hover:text-destructive w-fit" onClick={() => setConfirm(true)}>
      <Trash2 /> Clear local data
    </Button>
  )
}

const NAMES: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", google: "Gemini", openrouter: "OpenRouter", moonshot: "Kimi (Moonshot)", figma: "Figma" }

const SIZES = [
  { id: "auto", label: "Auto", hint: "Full prompt; switches a model to the short one if it hits a request-size limit" },
  { id: "full", label: "Full", hint: "Always send the full Prism prompt and every tool" },
  { id: "compact", label: "Compact", hint: "About a quarter of the tokens, for small plans such as Groq's free tier" },
] as const

/** How much the agent sends per request for this provider's models. */
function PromptSize({ id }: { id: KeyedProvider }) {
  const size = useStore((s) => s.settings.providers[id].promptSize ?? "auto")
  const remembered = useStore((s) => s.settings.compactModels)
  const compactModels = Object.keys(remembered ?? {}).filter((k) => k.startsWith(`${id}:`))
  const patchProvider = useStore((s) => s.patchProvider)
  const patchSettings = useStore((s) => s.patchSettings)
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Prompt size</Label>
      <div className="bg-muted flex w-fit rounded-lg p-0.5" role="radiogroup" aria-label="Prompt size">
        {SIZES.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={size === o.id}
            title={o.hint}
            onClick={() => patchProvider(id, { promptSize: o.id })}
            className={cn("h-7 rounded-md px-3 text-[12.5px] transition-colors", size === o.id ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground")}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-[12px]">
        {SIZES.find((o) => o.id === size)!.hint}.
        {size === "auto" && compactModels.length > 0 && (
          <>
            {" "}
            Using the short prompt for {compactModels.map((k) => k.slice(id.length + 1)).join(", ")}.{" "}
            <button
              className="text-foreground underline underline-offset-2"
              onClick={() => {
                const all = { ...(useStore.getState().settings.compactModels ?? {}) }
                for (const k of compactModels) delete all[k]
                patchSettings({ compactModels: all })
              }}
            >
              Reset
            </button>
          </>
        )}
      </p>
    </div>
  )
}

function DeploymentCard() {
  const server = useServer()
  const settings = useStore((s) => s.settings)
  const patchSettings = useStore((s) => s.patchSettings)
  const [code, setCode] = useState(settings.accessCode ?? "")
  const [checking, setChecking] = useState(false)
  const on = Object.entries(server.providers).filter(([, v]) => v).map(([k]) => NAMES[k] ?? k)
  const verify = async () => {
    setChecking(true)
    patchSettings({ accessCode: code.trim() })
    const s = await checkServer()
    setChecking(false)
    if (s.authorized) {
      toast.success("Access code accepted")
      await loadServerModels()
    } else toast.error("That code didn't work.")
  }
  return (
    <Card title="This deployment" description={on.length ? `Keys provided on the server: ${on.join(", ")}. They never reach your browser.` : "No server keys are set. Add them as environment variables in Vercel, or use your own keys below."}>
      {server.accessRequired && (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            verify()
          }}
        >
          <Label htmlFor="access-code">Access code</Label>
          <div className="flex max-w-md gap-2">
            <Input id="access-code" type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="From whoever runs this deployment" autoComplete="off" />
            <Button type="submit" disabled={!code.trim() || checking}>
              {checking ? <Loader2 className="animate-spin" /> : server.authorized ? <Check /> : null}
              {server.authorized ? "Update" : "Unlock"}
            </Button>
          </div>
          <p className={cn("text-[12px]", server.authorized ? "text-ok" : "text-muted-foreground")}>{server.authorized ? "Unlocked. The server's keys are in use." : "Needed before the server's keys can be used."}</p>
        </form>
      )}
    </Card>
  )
}

/** Load models for every provider the server has a key for (and the person hasn't overridden). */
export async function loadServerModels() {
  const s = useServer.getState()
  if (!s.deployed || !s.authorized) return
  const providers = (["anthropic", "openai", "google", "openrouter", "moonshot"] as const).filter((p) => s.providers[p] && !useStore.getState().settings.providers[p].apiKey.trim())
  await Promise.all(providers.map((p) => connectProvider(p, true)))
}
