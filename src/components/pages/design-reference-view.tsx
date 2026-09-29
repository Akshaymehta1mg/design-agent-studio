import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { Check, ExternalLink, Loader2, Pencil, RotateCcw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { DesignEdits, DesignSystem } from "@/lib/types"
import { applyEdits, loadDesignReference, specimenRows, type Block, type DesignReference, type ReferenceTab, type Specimen } from "@/lib/design-reference"
import { editComponentWithModel } from "@/lib/design-edit"
import { friendlyError } from "@/lib/agent"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/chat/markdown"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

const OVERVIEW = "overview"
/** Tabs whose values are edited directly; every other tab is changed by describing it to Prism. */
const DIRECT_EDIT = new Set(["colors", "typography", "spacing", "corner-radius", "shadows", "gradients"])

type EditKind = Exclude<keyof DesignEdits, "components">
const EditCtx = createContext<{ editing: boolean; set: (kind: EditKind, key: string, value: string) => void }>({ editing: false, set: () => {} })

/** The edit keys that belong to one tab. */
function tabEdits(tabKey: string, e?: DesignEdits): number {
  if (!e) return 0
  if (tabKey === "colors") return Object.keys(e.palettes ?? {}).length + Object.keys(e.semantic ?? {}).length + Object.keys(e.brand ?? {}).length
  if (tabKey === "typography") return Object.keys(e.type ?? {}).length
  return Object.keys(e.tokens ?? {}).filter((k) => k.startsWith(`${tabKey}:`)).length + (e.components?.[tabKey] ? 1 : 0)
}

function resetTab(tabKey: string, e: DesignEdits): DesignEdits {
  if (tabKey === "colors") return { ...e, palettes: {}, semantic: {}, brand: {} }
  if (tabKey === "typography") return { ...e, type: {} }
  const tokens = Object.fromEntries(Object.entries(e.tokens ?? {}).filter(([k]) => !k.startsWith(`${tabKey}:`)))
  const components = { ...(e.components ?? {}) }
  delete components[tabKey]
  return { ...e, tokens, components }
}

/** The design system's component reference, rebuilt natively from the extracted data (same tabs as the HTML). */
export function DesignReferenceView({ ds }: { ds: DesignSystem }) {
  const [original, setOriginal] = useState<DesignReference | null>(null)
  const [tab, setTab] = useState(OVERVIEW)
  const edits = useStore((s) => s.designEdits[ds.id])
  useEffect(() => {
    loadDesignReference().then(setOriginal)
  }, [])
  const ref = useMemo(() => (original ? applyEdits(original, edits) : null), [original, edits])

  if (!ref) return <Spinner />
  const groups: [string, ReferenceTab[]][] = [
    ["Foundations", ref.tabs.filter((t) => t.group === "foundation")],
    ["Components", ref.tabs.filter((t) => t.group === "component")],
    ["Pages", ref.tabs.filter((t) => t.group === "page")],
  ]
  const current = ref.tabs.find((t) => t.key === tab)

  return (
    <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
      <nav className="flex flex-col gap-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto" aria-label="Design system sections" data-scrollable>
        <NavItem active={tab === OVERVIEW} onClick={() => setTab(OVERVIEW)}>
          Overview
        </NavItem>
        {groups.map(([name, tabs]) => (
          <div key={name} className="flex flex-col gap-0.5">
            <div className="eyebrow px-3 pb-1">{name}</div>
            {tabs.map((t) => (
              <NavItem key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  {tabEdits(t.key, edits) > 0 && <span className="size-1.5 shrink-0 rounded-full bg-[#FF6F61]" title="Edited by your team" />}
                </span>
              </NavItem>
            ))}
          </div>
        ))}
      </nav>
      <article className="bg-card min-w-0 rounded-2xl border p-6 shadow-xs">
        {tab === OVERVIEW ? <Overview ds={ds} ref_={ref} onOpen={setTab} /> : current ? <TabView key={current.key} tab={current} ref_={ref} ds={ds} /> : null}
      </article>
    </div>
  )
}

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors", active ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>
      {children}
    </button>
  )
}

function Overview({ ds, ref_, onOpen }: { ds: DesignSystem; ref_: DesignReference; onOpen: (key: string) => void }) {
  const count = (g: ReferenceTab["group"]) => ref_.tabs.filter((t) => t.group === g).length
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[22px] font-bold">{ds.name}</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          {ref_.colors.palettes.length} colour palettes · {ref_.colors.semantic.length} semantic tokens · {count("foundation")} foundations · {count("component")} components · {count("page")} page references. The agent reads every section below.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {ref_.tabs.map((t) => (
          <button key={t.key} onClick={() => onOpen(t.key)} className="hover:bg-accent/50 rounded-xl border p-3 text-left transition-colors">
            <div className="text-[13.5px] font-semibold">{t.title}</div>
            <div className="text-muted-foreground mt-0.5 line-clamp-2 text-[12px] leading-snug">{t.description}</div>
          </button>
        ))}
      </div>
      <div>
        <h3 className="mb-2 text-[15px] font-semibold">Guide</h3>
        <Markdown text={ds.profile} className="text-[13.5px] leading-relaxed" />
      </div>
    </div>
  )
}

function TabView({ tab, ref_, ds }: { tab: ReferenceTab; ref_: DesignReference; ds: DesignSystem }) {
  const edits = useStore((s) => s.designEdits[ds.id])
  const patch = useStore((s) => s.patchDesignEdits)
  const [editing, setEditing] = useState(false)
  const direct = DIRECT_EDIT.has(tab.key)
  const edited = tabEdits(tab.key, edits)
  const ctx = useMemo(
    () => ({
      editing,
      set: (kind: EditKind, key: string, value: string) => patch(ds.id, (e) => ({ ...e, [kind]: { ...(e[kind] ?? {}), [key]: value } })),
    }),
    [editing, patch, ds.id],
  )
  const live = ds.referenceUrl && tab.key !== "colors" ? `${ds.referenceUrl}?embed#${encodeURIComponent(tab.key)}` : null

  return (
    <EditCtx.Provider value={ctx}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="eyebrow">{tab.label || tab.group}</div>
            <h2 className="mt-1 text-[24px] leading-tight font-bold">{tab.title}</h2>
            <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">{tab.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {edited > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  patch(ds.id, (e) => resetTab(tab.key, e))
                  toast.success(`${tab.title} reset to the original`)
                }}
              >
                <RotateCcw /> Reset
              </Button>
            )}
            {direct && (
              <Button variant={editing ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setEditing((v) => !v)}>
                {editing ? <Check /> : <Pencil />} {editing ? "Done" : "Edit"}
              </Button>
            )}
            {ds.referenceUrl && (
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <a href={`${ds.referenceUrl}#${encodeURIComponent(tab.key)}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> Original
                </a>
              </Button>
            )}
          </div>
        </header>

        {!direct && <PrismChange tab={tab} dsId={ds.id} />}

        {live && <LivePreview url={live} tall={tab.group === "page"} edited={edited > 0} />}

        {tab.facts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tab.facts.map((f) => (
              <div key={f.label} className="bg-muted rounded-xl px-3 py-2">
                <div className="text-muted-foreground text-[11px]">{f.label}</div>
                <div className="text-[13.5px] font-semibold">{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {tab.notes.map((n) => (
          <div key={n.label} className="border-l-foreground/30 bg-muted/50 rounded-r-xl border-l-2 px-4 py-3 text-[13.5px] leading-relaxed">
            <div className="font-semibold">{n.label}</div>
            <div className="text-muted-foreground mt-0.5">{n.text}</div>
          </div>
        ))}

        {tab.key === "colors" && <Colors ref_={ref_} />}
        {tab.key === "typography" && <TypeScale tab={tab} />}

        {tab.key !== "colors" &&
          tab.key !== "typography" &&
          tab.sections.map((s, i) =>
            !s.title && !s.description && !s.blocks.length ? null : (
              <section key={i} className="flex flex-col gap-3">
                {s.title && <h3 className="text-[16px] font-semibold">{s.title}</h3>}
                {s.description && <p className="text-muted-foreground text-[13.5px] leading-relaxed">{s.description}</p>}
                {s.blocks.map((b, j) => (
                  <BlockView key={j} block={b} tabKey={tab.key} />
                ))}
              </section>
            ),
          )}

        {tab.css && (
          <details className="rounded-xl border">
            <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-medium">CSS from the reference</summary>
            <pre className="bg-muted max-h-[420px] overflow-auto rounded-b-xl p-4 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap" data-scrollable>
              {tab.css}
            </pre>
          </details>
        )}
      </div>
    </EditCtx.Provider>
  )
}

/** The original HTML reference, rendered live (menu hidden) for this tab. */
function LivePreview({ url, tall, edited }: { url: string; tall: boolean; edited: boolean }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[16px] font-semibold">Live reference</h3>
        {edited && <span className="text-muted-foreground text-[12px]">Original rendering. Your team's changes show in the specimens and specs below.</span>}
      </div>
      <div className="relative overflow-hidden rounded-xl border bg-white">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center">
            <Spinner />
          </div>
        )}
        <iframe src={url} title="Live design-system reference" onLoad={() => setLoaded(true)} className={cn("block w-full bg-white", tall ? "h-[1000px]" : "h-[560px]")} />
      </div>
    </section>
  )
}

/** Describe a component change; the model rewrites the component's team rules and adjusts its demos. */
function PrismChange({ tab, dsId }: { tab: ReferenceTab; dsId: string }) {
  const current = useStore((s) => s.designEdits[dsId]?.components?.[tab.key])
  const patch = useStore((s) => s.patchDesignEdits)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)

  const apply = async () => {
    const instruction = text.trim()
    if (!instruction || busy) return
    setBusy(true)
    try {
      const change = await editComponentWithModel(tab, instruction, current)
      patch(dsId, (e) => ({ ...e, components: { ...(e.components ?? {}), [tab.key]: change } }))
      setText("")
      toast.success(`${tab.title} updated`, { description: change.summary })
    } catch (e) {
      toast.error(`Couldn't change ${tab.title}`, { description: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold">
        <Sparkles className="size-4" /> Change this {tab.group === "page" ? "page pattern" : "component"} with Prism
      </div>
      {current && (
        <div className="bg-card flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 text-[13px] font-medium">{current.summary}</div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full text-[12px]"
              onClick={() => {
                patch(dsId, (e) => resetTab(tab.key, e))
                toast.success(`${tab.title} reverted`)
              }}
            >
              <RotateCcw /> Revert
            </Button>
          </div>
          <details>
            <summary className="text-muted-foreground cursor-pointer text-[12px]">Team rules the agent follows</summary>
            <Markdown text={current.spec} className="mt-2 text-[13px] leading-relaxed" />
          </details>
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            apply()
          }
        }}
        placeholder={`e.g. "Make primary buttons 48px tall with a 12px radius"`}
        className="bg-card min-h-[64px] text-[13.5px]"
        disabled={busy}
      />
      <div className="flex items-center gap-3">
        <Button size="sm" className="rounded-full" onClick={apply} disabled={!text.trim() || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? "Applying…" : "Apply change"}
        </Button>
        <span className="text-muted-foreground text-[12px]">Uses the model selected in chat. The agent follows the new rules in every project.</span>
      </div>
    </section>
  )
}

const camel = (k: string) => k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

function SpecimenView({ s }: { s: Specimen }) {
  // Re-create the specimen from its captured computed styles.
  const style = useMemo(() => {
    const out: Record<string, string> = { display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }
    for (const [k, v] of Object.entries(s.style)) {
      // Captured widths are minimums: the replica's font may be slightly wider than the original.
      if (k === "width") out.minWidth = v
      else out[camel(k)] = k === "font-family" ? `"${v}", var(--font-sans)` : v
    }
    return out as React.CSSProperties
  }, [s])
  const st = s.style
  const spec = [st.width && st.height ? `${st.width.replace("px", "")}×${st.height}` : "", st["border-radius"] ? `r ${st["border-radius"]}` : "", st["background-color"] ?? "", st["font-size"] ? `${st["font-size"]}/${st["font-weight"] ?? ""}` : ""].filter(Boolean).join(" · ")
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <div style={style} className="max-w-full">
        <span className="whitespace-nowrap">{s.text}</span>
      </div>
      <div className="text-muted-foreground font-mono text-[10.5px]">{spec}</div>
    </div>
  )
}

function TokenValue({ tabKey, name, value, className }: { tabKey: string; name: string; value: string; className?: string }) {
  const { editing, set } = useContext(EditCtx)
  if (!editing) return <span className={className}>{value}</span>
  return <EditInput value={value} onCommit={(v) => set("tokens", `${tabKey}:${name}`, v)} className={className} aria-label={`${name} value`} />
}

/** Text input that commits on blur or Enter, so the store isn't written on every keystroke. */
function EditInput({ value, onCommit, className, ...rest }: { value: string; onCommit: (v: string) => void; className?: string } & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    const v = draft.trim()
    if (v && v !== value) onCommit(v)
    else setDraft(value)
  }
  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={cn("bg-card focus-visible:ring-ring/40 w-full min-w-0 rounded-md border px-1.5 py-0.5 font-mono text-[11.5px] outline-none focus-visible:ring-2", className)}
    />
  )
}

function BlockView({ block: b, tabKey }: { block: Block; tabKey: string }) {
  if (b.type === "text") return <p className="text-[13.5px] leading-relaxed">{b.text}</p>
  if (b.type === "table") return <Table rows={b.rows} />
  if (b.type === "outline")
    return (
      <pre className="bg-muted max-h-[480px] overflow-auto rounded-xl p-4 font-mono text-[11.5px] leading-relaxed" data-scrollable>
        {b.text}
      </pre>
    )
  if (b.type === "demo")
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start gap-5 rounded-xl border bg-white p-5 dark:bg-white">
          {b.specimens.map((s, i) => (
            <SpecimenView key={i} s={s} />
          ))}
        </div>
        <details>
          <summary className="text-muted-foreground cursor-pointer text-[12.5px]">Specs</summary>
          <div className="mt-2">
            <Table rows={specimenRows(b.specimens)} />
          </div>
        </details>
      </div>
    )
  // tokens
  if (b.kind === "spacing")
    return (
      <div className="flex flex-col gap-2">
        {b.items.map((i) => (
          <div key={i.name} className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground w-8 text-right font-mono">{i.name}</span>
            <span className="bg-foreground/80 h-4 rounded-sm" style={{ width: Math.max(1, parseFloat(i.value) * 4) }} />
            <TokenValue tabKey={tabKey} name={i.name} value={i.value} className="w-32 font-mono" />
          </div>
        ))}
      </div>
    )
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {b.items.map((i) => (
        <div key={i.name} className="flex flex-col gap-2">
          <div
            className="h-20 border"
            style={
              b.kind === "radius"
                ? { borderRadius: i.value, background: "var(--muted)" }
                : b.kind === "shadow"
                  ? { boxShadow: i.value, borderRadius: 12, background: "white" }
                  : { backgroundImage: i.value, borderRadius: 12 }
            }
          />
          <div className="text-[12.5px] font-medium">{i.name}</div>
          <TokenValue tabKey={tabKey} name={i.name} value={i.value} className="text-muted-foreground font-mono text-[10.5px] break-all" />
        </div>
      ))}
    </div>
  )
}

function Table({ rows }: { rows: string[][] }) {
  if (!rows.length) return null
  return (
    <div className="overflow-x-auto rounded-xl border" data-scrollable>
      <table className="w-full text-left text-[12.5px]">
        <thead className="bg-muted">
          <tr>
            {rows[0].map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {/#[0-9A-F]{6}\b/i.test(c) && c.length < 40 ? <HexCell value={c} /> : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HexCell({ value }: { value: string }) {
  const hex = value.match(/#[0-9A-F]{6}/i)![0]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-3.5 shrink-0 rounded border" style={{ background: hex }} />
      {value}
    </span>
  )
}

const HEX = /^#[0-9a-f]{6}$/i

function Swatch({ hex, label, sub, onChange }: { hex: string; label: string; sub?: string; onChange?: (hex: string) => void }) {
  const { editing } = useContext(EditCtx)
  const edit = editing && onChange
  return (
    <div className="flex w-[92px] flex-col gap-1">
      <div className="relative h-14 overflow-hidden rounded-lg border" style={{ background: hex }} title={hex}>
        {edit && (
          <>
            <input type="color" value={HEX.test(hex) ? hex : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={`${label} colour`} />
            <Pencil className="pointer-events-none absolute right-1.5 bottom-1.5 size-3.5 text-white mix-blend-difference" />
          </>
        )}
      </div>
      <div className="text-[12px] leading-tight font-medium">{label}</div>
      {edit ? (
        <EditInput value={hex} onCommit={(v) => HEX.test(v) ? onChange(v.toUpperCase()) : toast.error("Use a 6-digit hex like #FF6F61")} aria-label={`${label} hex`} />
      ) : (
        <div className="text-muted-foreground font-mono text-[10.5px]">{sub ?? hex}</div>
      )}
    </div>
  )
}

function Colors({ ref_ }: { ref_: DesignReference }) {
  const { brand, semantic, palettes } = ref_.colors
  const { editing, set } = useContext(EditCtx)
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-[16px] font-semibold">Brand</h3>
        <div className="flex flex-wrap gap-3">
          {brand.map((b) => (
            <Swatch key={b.name} hex={b.hex} label={b.name} sub={`${b.hex} · ${b.use}`} onChange={(v) => set("brand", b.name, v)} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-[16px] font-semibold">Semantic tokens</h3>
        <p className="text-muted-foreground text-[13.5px]">Apply colours by role. These are what wireframes should use.</p>
        {editing ? (
          <div className="flex flex-wrap gap-3">
            {semantic.map((s) => (
              <Swatch key={s.token} hex={s.hex} label={s.token} onChange={(v) => set("semantic", s.token, v)} />
            ))}
          </div>
        ) : (
          <Table rows={[["Token", "Role", "Maps to"], ...semantic.map((s) => [s.token, s.role, s.maps])]} />
        )}
      </section>
      {palettes.map((p) => (
        <section key={p.id} className="flex flex-col gap-3">
          <h3 className="text-[16px] font-semibold">{p.name}</h3>
          <div className="flex flex-wrap gap-2">
            {p.stops.map((s) => (
              <Swatch key={s.stop} hex={s.hex} label={s.stop} onChange={(v) => set("palettes", `${p.id}:${s.stop}`, v)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** Type scale rows rendered live: "Heading / 32/800 Extrabold" + "32 / 800 / 40". */
function TypeScale({ tab }: { tab: ReferenceTab }) {
  const { editing, set } = useContext(EditCtx)
  return (
    <div className="flex flex-col gap-8">
      {tab.sections.map((s, i) => {
        const rows = s.blocks.flatMap((b) => (b.type === "table" ? b.rows.slice(1) : []))
        if (!rows.length) return null
        const display = /display/i.test(s.title)
        return (
          <section key={i} className="flex flex-col gap-2">
            <h3 className="text-[16px] font-semibold">{s.title}</h3>
            <div className="divide-y rounded-xl border">
              {rows.map(([name, metrics]) => {
                const [size, weight, lh] = metrics.split("/").map((x) => parseFloat(x))
                return (
                  <div key={name} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-4 py-3">
                    <span
                      className="min-w-0 flex-1 truncate"
                      style={{ fontFamily: display ? '"Cabinet Grotesk Variable", "Cabinet Grotesk", var(--font-sans)' : '"Figtree", var(--font-sans)', fontSize: size, fontWeight: weight, lineHeight: lh ? `${lh}px` : undefined }}
                    >
                      {display ? "Dopamine" : name.split("/")[0].trim() === "Body" ? "Body text sample" : name.split("/")[0].trim()}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[12px]">{name}</span>
                    {editing ? (
                      <EditInput value={metrics} onCommit={(v) => (/^\d+\s*\/\s*\d+/.test(v) ? set("type", name, v) : toast.error("Use size / weight / line height, e.g. 16 / 600 / 24"))} className="w-36 shrink-0 text-[12px]" aria-label={`${name} metrics`} />
                    ) : (
                      <span className="shrink-0 font-mono text-[12px]">{metrics}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
