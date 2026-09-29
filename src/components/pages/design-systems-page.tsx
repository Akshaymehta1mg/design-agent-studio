import { useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import { AlertCircle, ArrowLeft, Check, Copy, ExternalLink, FileJson, Images, Loader2, PenLine, Plus, RefreshCw, Star, Trash2, Upload, Shapes as Figma } from "@/components/ui/icons"
import { toast } from "sonner"
import type { DesignSystem } from "@/lib/types"
import { uid, useStore } from "@/lib/store"
import { allDesignSystems, wireframeVars } from "@/lib/design-systems"
import { buildSrcDoc, PREVIEW_WIREFRAME } from "@/lib/wireframe"
import { friendlyError, generate } from "@/lib/agent"
import { fetchDesignSystem, hasFigmaAccess, parseFigmaUrl } from "@/lib/figma"
import { readAsText } from "@/lib/files"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { PageHeader, Section } from "./page-header"
import { DesignReferenceView } from "./design-reference-view"

const blank = (): DesignSystem => ({
  id: uid("ds_"),
  name: "Untitled design system",
  description: "",
  source: "figma",
  profile: "",
  colors: [
    { name: "Primary", value: "#2563eb" },
    { name: "Surface", value: "#ffffff" },
    { name: "Text", value: "#111827" },
  ],
  font: "",
  radius: 12,
  updatedAt: Date.now(),
})

export function DesignSystemsPage() {
  const custom = useStore((s) => s.designSystems)
  const upsert = useStore((s) => s.upsertDesignSystem)
  const [openId, setOpenId] = useState<string | null>(null)
  const systems = allDesignSystems(custom)
  const open = systems.find((d) => d.id === openId)

  if (open) return <DesignSystemEditor ds={open} onBack={() => setOpenId(null)} onOpen={setOpenId} />

  const create = () => {
    const ds = blank()
    upsert(ds)
    setOpenId(ds.id)
  }
  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-6 pb-16 md:px-10">
        <PageHeader
          title="Design systems"
          description="Pull your team's system from a Figma library or a tokens file. The agent follows the one a project uses, and wireframes pick up its color, radius and type."
          action={
            <Button className="rounded-full" onClick={create}>
              <Plus /> Create design system
            </Button>
          }
        />
        <Section title="Your design systems">
          {custom.length ? (
            <Grid systems={custom} onOpen={setOpenId} />
          ) : (
            <button onClick={create} className="hover:bg-muted/50 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors">
              <Plus className="text-muted-foreground size-5" />
              <span className="text-[14px] font-medium">Create your first design system</span>
              <span className="text-muted-foreground max-w-md text-[13px]">Link a Figma library, upload design tokens, or infer one from the screens in your Context file.</span>
            </button>
          )}
        </Section>
        <Section title="Built in">
          <Grid systems={systems.filter((d) => d.builtIn)} onOpen={setOpenId} />
        </Section>
      </div>
    </div>
  )
}

function Grid({ systems, onOpen }: { systems: DesignSystem[]; onOpen: (id: string) => void }) {
  const def = useStore((s) => s.defaultDesignSystemId)
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {systems.map((d, i) => (
        <motion.button
          key={d.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.03 }}
          onClick={() => onOpen(d.id)}
          className="group bg-card overflow-hidden rounded-2xl border text-left shadow-xs transition-shadow hover:shadow-md"
        >
          <Specimen ds={d} />
          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14px] font-semibold">{d.name}</span>
              {def === d.id && (
                <Badge variant="secondary" className="text-[10.5px]">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[12.5px] leading-snug">{d.description || "No description yet"}</p>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

function Specimen({ ds }: { ds: DesignSystem }) {
  const primary = ds.colors.find((c) => /primary|tint|accent|brand|ink/i.test(c.name))?.value ?? ds.colors[0]?.value ?? "#111"
  return (
    <div className="bg-muted/60 flex h-36 flex-col justify-between p-4">
      <div className="flex gap-1.5">
        {ds.colors.slice(0, 6).map((c) => (
          <span key={c.name + c.value} title={`${c.name} ${c.value}`} className="size-7 rounded-full border shadow-xs" style={{ background: c.value }} />
        ))}
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="text-[34px] leading-none font-semibold" style={{ fontFamily: ds.font && !/system/i.test(ds.font) ? `"${ds.font}", var(--font-sans)` : undefined }}>
          Aa
        </span>
        <span className="px-3 py-1.5 text-[12px] font-semibold text-white shadow-xs" style={{ background: primary, borderRadius: ds.radius ?? 8 }}>
          Button
        </span>
      </div>
    </div>
  )
}

// ───────────────────────── editor ─────────────────────────

function flattenTokens(obj: unknown, path: string[] = [], out: { path: string; value: string; type?: string }[] = []) {
  if (out.length > 400 || obj === null || typeof obj !== "object") return out
  const o = obj as Record<string, unknown>
  const val = o.$value ?? o.value
  if (val !== undefined && (typeof val !== "object" || Array.isArray(val))) {
    out.push({ path: path.join("."), value: Array.isArray(val) ? val.join(", ") : String(val), type: (o.$type ?? o.type) as string | undefined })
    return out
  }
  for (const [k, v] of Object.entries(o)) if (!k.startsWith("$")) flattenTokens(v, [...path, k], out)
  return out
}

const PROFILE_SYSTEM =
  "You write compact design-system profiles that an AI design agent will use as ground truth. Output plain text with these headings on their own lines: Colors, Typography, Spacing & shape, Components, Patterns, Voice. Under each, 2–6 terse bullet lines starting with '- ', with concrete values or names. No preamble."

const SOURCES = [
  { id: "figma", label: "Figma library", icon: Figma },
  { id: "tokens", label: "Tokens file", icon: FileJson },
  { id: "screens", label: "From screens", icon: Images },
  { id: "manual", label: "Write it", icon: PenLine },
] as const

function DesignSystemEditor({ ds, onBack, onOpen }: { ds: DesignSystem; onBack: () => void; onOpen: (id: string) => void }) {
  const upsert = useStore((s) => s.upsertDesignSystem)
  const del = useStore((s) => s.deleteDesignSystem)
  const def = useStore((s) => s.defaultDesignSystemId)
  const setDefault = useStore((s) => s.setDefaultDesignSystem)
  const token = useStore((s) => s.settings.figmaToken)
  const product = useStore((s) => s.product)
  const setRoute = useStore((s) => s.setRoute)
  const tokensFile = useRef<HTMLInputElement>(null)
  const readOnly = !!ds.builtIn
  const set = (p: Partial<DesignSystem>) => upsert({ ...ds, ...p, updatedAt: Date.now() })

  const duplicate = () => {
    const copy: DesignSystem = { ...ds, id: uid("ds_"), name: `${ds.name} (copy)`, builtIn: false, source: "manual", updatedAt: Date.now() }
    upsert(copy)
    onOpen(copy.id)
  }

  const sync = async () => {
    set({ status: "syncing", error: undefined })
    try {
      let raw = ""
      let images: string[] = []
      const patch: Partial<DesignSystem> = {}
      if (ds.source === "figma") {
        const parsed = ds.figmaUrl ? parseFigmaUrl(ds.figmaUrl) : null
        if (!parsed) throw new Error("Paste the link to your library file.")
        if (!hasFigmaAccess(token)) throw new Error("Add a Figma token in Settings to read the library.")
        raw = await fetchDesignSystem(parsed.fileKey, token)
      } else if (ds.source === "tokens") {
        let text = ds.tokensRaw ?? ""
        if (ds.tokensUrl) {
          const res = await fetch(ds.tokensUrl).catch(() => {
            throw new Error("Couldn't fetch that URL. Check it's public and allows browser requests, or upload the file instead.")
          })
          if (!res.ok) throw new Error(`The tokens URL returned ${res.status}.`)
          text = await res.text()
          patch.tokensRaw = text
        }
        if (!text) throw new Error("Add a tokens URL or upload a JSON file.")
        const tokens = flattenTokens(JSON.parse(text))
        if (!tokens.length) throw new Error("No tokens found in that JSON.")
        const colors = tokens.filter((t) => /^#([0-9a-f]{3,8})$/i.test(t.value) || /^(rgb|hsl|oklch)\(/i.test(t.value)).slice(0, 8)
        if (colors.length) patch.colors = colors.map((c) => ({ name: c.path.split(".").slice(-2).join(" "), value: c.value }))
        const radius = tokens.find((t) => /radius/i.test(t.path) && /^\d+(px)?$/.test(t.value))
        if (radius) patch.radius = parseInt(radius.value)
        const font = tokens.find((t) => /font.?family/i.test(t.path) || t.type === "fontFamily")
        if (font) patch.font = font.value.split(",")[0].replace(/["']/g, "").trim()
        raw = `Design tokens (${tokens.length}):\n${tokens.map((t) => `${t.path}: ${t.value}`).join("\n")}`
      } else if (ds.source === "screens") {
        const read = product.screens.filter((s) => s.summary && s.status === "read")
        if (!read.length) throw new Error("Add and read a few screens in your Context file first.")
        raw = read.map((s) => `${s.name}: ${s.summary}`).join("\n")
        images = read.slice(0, 4).map((s) => s.src)
      } else {
        throw new Error("Write the profile below, or pick a source to sync from.")
      }
      let profile = await generate(`Build the profile from this source material.\n\n${raw.slice(0, 40000)}`, PROFILE_SYSTEM, images)
      if (!profile) profile = raw.slice(0, 4000)
      upsert({ ...ds, ...patch, profile, status: "idle", updatedAt: Date.now() })
      toast.success("Design system synced")
    } catch (e) {
      upsert({ ...ds, status: "error", error: friendlyError(e), updatedAt: Date.now() })
    }
  }

  const previewDoc = useMemo(() => buildSrcDoc(PREVIEW_WIREFRAME, wireframeVars(ds)), [ds])

  const defaultAction =
    def === ds.id ? (
      <Badge variant="secondary" className="h-8 gap-1 rounded-full px-3 text-[12.5px]">
        <Check className="size-3.5" /> Default for new projects
      </Badge>
    ) : (
      <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={() => setDefault(ds.id)}>
        <Star /> Make default
      </Button>
    )

  if (ds.id === "ds_tata1mg")
    return (
      <DesignReferenceView
        ds={ds}
        onBack={onBack}
        actions={
          <>
            {defaultAction}
            <Button variant="ghost" size="sm" className="h-8 rounded-full" onClick={duplicate}>
              <Copy /> Duplicate
            </Button>
          </>
        }
      />
    )

  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto max-w-[1180px] px-6 pb-16 md:px-10">
        <div className="flex flex-wrap items-center gap-2 pt-6">
          <Button variant="ghost" size="sm" className="-ml-2 rounded-full" onClick={onBack}>
            <ArrowLeft /> Design systems
          </Button>
          <div className="flex-1" />
          {defaultAction}
          <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={duplicate}>
            <Copy /> Duplicate
          </Button>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-8 rounded-full"
              onClick={() => {
                del(ds.id)
                onBack()
              }}
            >
              <Trash2 /> Delete
            </Button>
          )}
        </div>

        <div className="grid gap-10 pt-6 lg:grid-cols-[1fr_360px]">
          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex flex-col gap-2">
              {readOnly ? (
                <h1 className="text-[30px] leading-tight font-bold">{ds.name}</h1>
              ) : (
                <input id="ds-name" value={ds.name} onChange={(e) => set({ name: e.target.value })} className="font-display rounded-md bg-transparent text-[30px] leading-tight font-bold tracking-[-0.02em] outline-none focus:ring-2 focus:ring-ring/40" aria-label="Name" />
              )}
              {readOnly ? (
                <p className="text-muted-foreground text-[14.5px]">{ds.description}</p>
              ) : (
                <input id="ds-description" value={ds.description} onChange={(e) => set({ description: e.target.value })} placeholder="What it's for, in a sentence" className="text-muted-foreground placeholder:text-muted-foreground/60 rounded-md bg-transparent text-[14.5px] outline-none focus:ring-2 focus:ring-ring/40" aria-label="Description" />
              )}
              {readOnly && <p className="text-muted-foreground text-[13px]">Built-in systems can't be edited. Duplicate this one to make it yours.</p>}
            </div>

            {!readOnly && (
              <Section
                title="Source"
                description="Where the system lives. Sync to pull it in and write the profile."
                action={
                  <Button onClick={sync} disabled={ds.status === "syncing" || ds.source === "manual"} className="rounded-full">
                    {ds.status === "syncing" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    Sync
                  </Button>
                }
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SOURCES.map((s) => (
                    <button key={s.id} onClick={() => set({ source: s.id })} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors", ds.source === s.id ? "border-foreground bg-card shadow-xs" : "hover:bg-muted/50")}>
                      <s.icon className="size-4 shrink-0" />
                      {s.label}
                    </button>
                  ))}
                </div>
                {ds.source === "figma" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ds-figma" className="text-muted-foreground text-[12.5px]">
                      Library file link
                    </Label>
                    <Input id="ds-figma" value={ds.figmaUrl ?? ""} onChange={(e) => set({ figmaUrl: e.target.value })} placeholder="https://www.figma.com/design/…/Design-System" />
                    <p className="text-muted-foreground text-[12px]">
                      Reads published styles, components and variables (variables need a Figma Enterprise plan).{" "}
                      {!hasFigmaAccess(token) && (
                        <button className="text-foreground underline underline-offset-2" onClick={() => setRoute("settings")}>
                          Add a Figma token
                        </button>
                      )}
                    </p>
                  </div>
                )}
                {ds.source === "tokens" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ds-tokens" className="text-muted-foreground text-[12.5px]">
                      Tokens URL (W3C, Tokens Studio or Style Dictionary JSON)
                    </Label>
                    <div className="flex gap-2">
                      <Input id="ds-tokens" value={ds.tokensUrl ?? ""} onChange={(e) => set({ tokensUrl: e.target.value })} placeholder="https://raw.githubusercontent.com/org/tokens/main/tokens.json" className="font-mono text-[12.5px]" />
                      <Button variant="outline" onClick={() => tokensFile.current?.click()}>
                        <Upload /> Upload
                      </Button>
                    </div>
                    {ds.tokensRaw && !ds.tokensUrl && (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-[12px]">
                        <Check className="text-ok size-3.5" /> Tokens file loaded. Sync to read it.
                      </span>
                    )}
                    <input
                      ref={tokensFile}
                      type="file"
                      accept=".json,application/json"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ""
                        if (f) set({ tokensRaw: await readAsText(f), tokensUrl: "" })
                      }}
                    />
                  </div>
                )}
                {ds.source === "screens" && (
                  <p className="text-muted-foreground text-[13px]">
                    Uses the {product.screens.filter((s) => s.status === "read").length} screens read in your{" "}
                    <button className="text-foreground underline underline-offset-2" onClick={() => setRoute("context")}>
                      Context file
                    </button>
                    .
                  </p>
                )}
                {ds.status === "error" && (
                  <div className="border-destructive/30 bg-destructive/5 flex gap-2 rounded-xl border p-3 text-[13px]">
                    <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                    {ds.error}
                  </div>
                )}
              </Section>
            )}

            <Section title="Foundations">
              <div className="bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-xs">
                <div className="flex flex-col gap-2">
                  <span className="text-muted-foreground text-[12.5px] font-medium">Colors</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ds.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border shadow-xs" style={{ background: c.value }}>
                          <input
                            type="color"
                            disabled={readOnly}
                            value={/^#[0-9a-f]{6}$/i.test(c.value) ? c.value : "#000000"}
                            onChange={(e) => set({ colors: ds.colors.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })}
                            className="absolute inset-0 cursor-pointer opacity-0"
                            aria-label={`${c.name} color`}
                          />
                        </label>
                        <Input disabled={readOnly} value={c.name} onChange={(e) => set({ colors: ds.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="h-9 min-w-0" aria-label="Color name" />
                        <Input disabled={readOnly} value={c.value} onChange={(e) => set({ colors: ds.colors.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} className="h-9 w-28 shrink-0 font-mono text-[12px]" aria-label="Color value" />
                        {!readOnly && (
                          <button onClick={() => set({ colors: ds.colors.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive grid size-8 shrink-0 place-items-center rounded-md" aria-label="Remove color">
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!readOnly && (
                    <Button variant="ghost" size="sm" className="w-fit rounded-full" onClick={() => set({ colors: [...ds.colors, { name: "New color", value: "#888888" }] })}>
                      <Plus /> Add color
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ds-font" className="text-muted-foreground text-[12.5px]">
                      Typeface
                    </Label>
                    <Input id="ds-font" disabled={readOnly} value={ds.font ?? ""} onChange={(e) => set({ font: e.target.value })} placeholder="Inter" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ds-radius" className="text-muted-foreground text-[12.5px]">
                      Corner radius · {ds.radius ?? 0}px
                    </Label>
                    <input id="ds-radius" type="range" min={0} max={28} disabled={readOnly} value={ds.radius ?? 0} onChange={(e) => set({ radius: Number(e.target.value) })} className="accent-foreground h-9" />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Profile" description="What the agent reads. Edit anything the sync got wrong.">
              <Textarea
                id="ds-profile"
                disabled={readOnly}
                value={ds.profile}
                onChange={(e) => set({ profile: e.target.value })}
                placeholder={"Colors\n- …\nTypography\n- …\nSpacing & shape\n- …\nComponents\n- …\nPatterns\n- …\nVoice\n- …"}
                className="min-h-72 font-mono text-[12.5px] leading-relaxed"
              />
            </Section>


          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="text-muted-foreground mb-2 text-[12.5px] font-medium">Preview · wireframe with this system</div>
            <div className="bg-muted flex justify-center overflow-hidden rounded-2xl border p-5">
              <div className="overflow-hidden rounded-[22px] border bg-white shadow-md" style={{ width: 390 * 0.72, height: 844 * 0.72 }}>
                <iframe title="Design system preview" srcDoc={previewDoc} sandbox="" tabIndex={-1} className="pointer-events-none origin-top-left border-0" style={{ width: 390, height: 844, transform: "scale(0.72)" }} />
              </div>
            </div>
          </aside>
        </div>

        <div className="pt-10">
          {ds.referenceUrl ? (
            <Section
              title="Component reference"
              action={
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <a href={ds.referenceUrl} target="_blank" rel="noreferrer">
                    <ExternalLink /> Open in a new tab
                  </a>
                </Button>
              }
            >
              <iframe title={`${ds.name} component reference`} src={ds.referenceUrl} loading="lazy" className="h-[80vh] w-full rounded-2xl border bg-white shadow-xs" />
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
