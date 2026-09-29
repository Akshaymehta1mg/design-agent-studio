import { createContext, Fragment, useContext, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, Code, ExternalLink, Eye, LayoutDashboard, Loader2, PanelRight, Pencil, RotateCcw, Ruler, Search, Sparkles } from "@/components/ui/icons"
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

type View = "preview" | "specs" | "css"

/**
 * The design-system workspace: section list | canvas (live preview, specs, CSS) | inspector side sheet.
 * Built from the extracted reference; the canvas embeds the original HTML for each section.
 */
export function DesignReferenceView({ ds, onBack, actions }: { ds: DesignSystem; onBack: () => void; actions?: React.ReactNode }) {
  const [original, setOriginal] = useState<DesignReference | null>(null)
  const [tab, setTab] = useState(OVERVIEW)
  const [view, setView] = useState<View>("preview")
  const [query, setQuery] = useState("")
  const [inspector, setInspector] = useState(true)
  const [editing, setEditing] = useState(false)
  const edits = useStore((s) => s.designEdits[ds.id])
  const patch = useStore((s) => s.patchDesignEdits)
  useEffect(() => {
    loadDesignReference().then(setOriginal)
  }, [])
  const ref = useMemo(() => (original ? applyEdits(original, edits) : null), [original, edits])
  const ctx = useMemo(
    () => ({
      editing,
      set: (kind: EditKind, key: string, value: string) => patch(ds.id, (e) => ({ ...e, [kind]: { ...(e[kind] ?? {}), [key]: value } })),
    }),
    [editing, patch, ds.id],
  )

  const current = ref?.tabs.find((t) => t.key === tab)
  const views: View[] = !current ? [] : [...(ds.referenceUrl && current.key !== "colors" ? (["preview"] as const) : []), "specs", ...(current.css ? (["css"] as const) : [])]
  const shown: View = views.includes(view) ? view : (views[0] ?? "specs")

  const open = (key: string) => {
    setTab(key)
    setEditing(false)
  }
  const q = query.trim().toLowerCase()
  const groups: [string, ReferenceTab[]][] = ref
    ? (
        [
          ["Foundations", ref.tabs.filter((t) => t.group === "foundation")],
          ["Components", ref.tabs.filter((t) => t.group === "component")],
          ["Pages", ref.tabs.filter((t) => t.group === "page")],
        ] as [string, ReferenceTab[]][]
      ).map(([n, ts]) => [n, ts.filter((t) => !q || `${t.title} ${t.key} ${t.description}`.toLowerCase().includes(q))])
    : []

  return (
    <EditCtx.Provider value={ctx}>
      <div className="bg-background flex h-full min-h-0 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={onBack} aria-label="Back to design systems">
            <ArrowLeft />
          </Button>
          <nav className="flex min-w-0 items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground shrink-0">
              Design systems
            </button>
            <span className="text-muted-foreground/60">/</span>
            <span className="truncate font-medium">{ds.name}</span>
          </nav>
          <div className="flex-1" />
          {actions}
          <Button variant={inspector ? "secondary" : "ghost"} size="icon" className="size-8" onClick={() => setInspector((v) => !v)} aria-label={inspector ? "Hide inspector" : "Show inspector"} aria-pressed={inspector}>
            <PanelRight />
          </Button>
        </header>

        {!ref ? (
          <div className="grid flex-1 place-items-center">
            <Spinner />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* section list */}
            <aside className="bg-sidebar hidden w-[236px] shrink-0 flex-col border-r md:flex">
              <div className="p-2.5">
                <div className="bg-background focus-within:ring-ring/40 flex h-8 items-center gap-2 rounded-lg border px-2.5 focus-within:ring-2">
                  <Search className="text-muted-foreground size-3.5 shrink-0" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sections" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none" aria-label="Search sections" />
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-4" data-scrollable aria-label="Design system sections" role="navigation">
                {!q && (
                  <NavItem active={tab === OVERVIEW} onClick={() => open(OVERVIEW)}>
                    <LayoutDashboard className="size-3.5 shrink-0" /> <span className="flex-1">Overview</span>
                  </NavItem>
                )}
                {groups.map(([name, tabs]) =>
                  !tabs.length ? null : (
                    <div key={name} className="flex flex-col gap-px">
                      <div className="text-muted-foreground flex items-center px-2 pb-1 text-[11px] font-medium">
                        <span className="flex-1">{name}</span>
                        <span className="tabular-nums">{tabs.length}</span>
                      </div>
                      {tabs.map((t) => (
                        <NavItem key={t.key} active={tab === t.key} onClick={() => open(t.key)}>
                          <span className="min-w-0 flex-1 truncate">{t.title}</span>
                          {tabEdits(t.key, edits) > 0 && <span className="size-1.5 shrink-0 rounded-full bg-[var(--pin)]" title="Edited by your team" />}
                        </NavItem>
                      ))}
                    </div>
                  ),
                )}
                {q && groups.every(([, ts]) => !ts.length) && <p className="text-muted-foreground px-2 text-[12.5px]">No sections match.</p>}
              </div>
            </aside>

            {/* canvas */}
            <section aria-label="Canvas" className="flex min-w-0 flex-1 flex-col bg-[var(--canvas)]">
              {current ? (
                <>
                  <div className="flex h-11 shrink-0 items-center gap-3 border-b px-4">
                    <span className="truncate text-[13.5px] font-semibold">{current.title}</span>
                    <span className="text-muted-foreground hidden text-[12px] capitalize sm:inline">{current.group}</span>
                    <div className="flex-1" />
                    {views.length > 1 && (
                      <div className="bg-muted flex rounded-lg p-0.5" role="tablist" aria-label="View">
                        {views.map((v) => (
                          <button
                            key={v}
                            role="tab"
                            aria-selected={shown === v}
                            onClick={() => setView(v)}
                            className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] transition-colors", shown === v ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground")}
                          >
                            {v === "preview" ? <Eye className="size-3.5" /> : v === "specs" ? <Ruler className="size-3.5" /> : <Code className="size-3.5" />}
                            {v === "preview" ? "Preview" : v === "specs" ? "Specs" : "CSS"}
                          </button>
                        ))}
                      </div>
                    )}
                    {ds.referenceUrl && (
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <a href={`${ds.referenceUrl}#${encodeURIComponent(current.key)}`} target="_blank" rel="noreferrer" aria-label="Open the original in a new tab" title="Open the original">
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                  </div>
                  {shown === "preview" && ds.referenceUrl ? (
                    <div className="min-h-0 flex-1 p-4">
                      <LivePreview key={current.key} url={`${ds.referenceUrl}?embed#${encodeURIComponent(current.key)}`} edited={tabEdits(current.key, edits) > 0} onSpecs={() => setView("specs")} />
                    </div>
                  ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto p-4" data-scrollable>
                      <div className="bg-background mx-auto max-w-[960px] rounded-xl border p-6">{shown === "css" ? <CssView css={current.css} /> : <Specs tab={current} ref_={ref} />}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-4" data-scrollable>
                  <div className="bg-background mx-auto max-w-[960px] rounded-xl border p-6">
                    <Overview ds={ds} ref_={ref} onOpen={open} />
                  </div>
                </div>
              )}
            </section>

            {/* inspector side sheet */}
            {inspector && (
              <aside className="bg-background hidden w-[320px] shrink-0 flex-col border-l lg:flex">
                <div className="min-h-0 flex-1 overflow-y-auto" data-scrollable>
                  {current ? (
                    <Inspector
                      tab={current}
                      ds={ds}
                      edited={tabEdits(current.key, edits)}
                      editing={editing}
                      onEdit={() => {
                        setEditing((v) => !v)
                        setView("specs")
                      }}
                      onReset={() => {
                        patch(ds.id, (e) => resetTab(current.key, e))
                        toast.success(`${current.title} reset to the original`)
                      }}
                    />
                  ) : (
                    <OverviewInspector ds={ds} edits={edits} ref_={ref} onOpen={open} />
                  )}
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </EditCtx.Provider>
  )
}

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-current={active ? "page" : undefined} className={cn("flex h-7 items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors", active ? "bg-sidebar-accent font-medium" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60")}>
      {children}
    </button>
  )
}

function InspectorSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-b px-4 py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <h3 className="text-muted-foreground flex-1 text-[11.5px] font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Inspector({ tab, ds, edited, editing, onEdit, onReset }: { tab: ReferenceTab; ds: DesignSystem; edited: number; editing: boolean; onEdit: () => void; onReset: () => void }) {
  const direct = DIRECT_EDIT.has(tab.key)
  return (
    <>
      <InspectorSection title="Section">
        <div>
          <div className="text-[15px] font-semibold">{tab.title}</div>
          <p className="text-muted-foreground mt-1 text-[12.5px] leading-relaxed">{tab.description}</p>
        </div>
        {tab.facts.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
            {tab.facts.map((f) => (
              <Fragment key={f.label}>
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="font-medium">{f.value}</dd>
              </Fragment>
            ))}
          </dl>
        )}
      </InspectorSection>

      {direct ? (
        <InspectorSection title="Values">
          <p className="text-muted-foreground text-[12.5px] leading-relaxed">
            {editing ? "Change values in the specs. Changes save as you go and the agent uses them in every project." : "Change colours, sizes and tokens directly. The agent uses your values in every project."}
          </p>
          <Button variant={editing ? "default" : "outline"} size="sm" className="w-fit" onClick={onEdit}>
            {editing ? <Check /> : <Pencil />} {editing ? "Done editing" : "Edit values"}
          </Button>
        </InspectorSection>
      ) : (
        <InspectorSection title={`Change with Prism`}>
          <PrismChange tab={tab} dsId={ds.id} />
        </InspectorSection>
      )}

      {tab.notes.length > 0 && (
        <InspectorSection title="Usage">
          <div className="flex flex-col gap-3">
            {tab.notes.map((n) => (
              <div key={n.label} className="text-[12.5px] leading-relaxed">
                <div className="font-medium">{n.label}</div>
                <div className="text-muted-foreground mt-0.5">{n.text}</div>
              </div>
            ))}
          </div>
        </InspectorSection>
      )}

      {edited > 0 && (
        <InspectorSection
          title="Team changes"
          action={
            <Button variant="ghost" size="sm" className="text-muted-foreground h-6 px-2 text-[12px]" onClick={onReset}>
              <RotateCcw /> Reset
            </Button>
          }
        >
          <p className="text-muted-foreground text-[12.5px]">
            {edited === 1 ? "1 change to this section overrides" : `${edited} changes to this section override`} the original.
          </p>
        </InspectorSection>
      )}
    </>
  )
}

function OverviewInspector({ ds, edits, ref_, onOpen }: { ds: DesignSystem; edits?: DesignEdits; ref_: DesignReference; onOpen: (key: string) => void }) {
  const changed = ref_.tabs.filter((t) => tabEdits(t.key, edits) > 0)
  return (
    <>
      <InspectorSection title="Design system">
        <div className="text-[15px] font-semibold">{ds.name}</div>
        <p className="text-muted-foreground text-[12.5px] leading-relaxed">{ds.description}</p>
      </InspectorSection>
      <InspectorSection title="Team changes">
        {changed.length ? (
          <div className="flex flex-col gap-px">
            {changed.map((t) => (
              <NavItem key={t.key} active={false} onClick={() => onOpen(t.key)}>
                <span className="size-1.5 shrink-0 rounded-full bg-[var(--pin)]" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="tabular-nums">{tabEdits(t.key, edits)}</span>
              </NavItem>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-[12.5px] leading-relaxed">None yet. Edit foundation values directly, or open a component and describe a change to Prism.</p>
        )}
      </InspectorSection>
    </>
  )
}

function Overview({ ds, ref_, onOpen }: { ds: DesignSystem; ref_: DesignReference; onOpen: (key: string) => void }) {
  const count = (g: ReferenceTab["group"]) => ref_.tabs.filter((t) => t.group === g).length
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[20px] font-semibold">{ds.name}</h2>
        <p className="text-muted-foreground mt-1 text-[13.5px]">
          {ref_.colors.palettes.length} colour palettes · {ref_.colors.semantic.length} semantic tokens · {count("foundation")} foundations · {count("component")} components · {count("page")} page references. The agent reads every section.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {ref_.tabs.map((t) => (
          <button key={t.key} onClick={() => onOpen(t.key)} className="hover:bg-accent/60 rounded-lg border p-3 text-left transition-colors">
            <div className="text-[13px] font-medium">{t.title}</div>
            <div className="text-muted-foreground mt-0.5 line-clamp-2 text-[12px] leading-snug">{t.description}</div>
          </button>
        ))}
      </div>
      <details className="rounded-lg border">
        <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-medium">Guide the agent follows</summary>
        <Markdown text={ds.profile} className="border-t px-4 py-3 text-[13px] leading-relaxed" />
      </details>
    </div>
  )
}

function Specs({ tab, ref_ }: { tab: ReferenceTab; ref_: DesignReference }) {
  if (tab.key === "colors") return <Colors ref_={ref_} />
  if (tab.key === "typography") return <TypeScale tab={tab} />
  const sections = tab.sections.filter((s) => s.title || s.description || s.blocks.length)
  if (!sections.length) return <p className="text-muted-foreground text-[13px]">No specs were extracted for this section. Use Preview.</p>
  return (
    <div className="flex flex-col gap-8">
      {sections.map((s, i) => (
        <section key={i} className="flex flex-col gap-3">
          {s.title && <h3 className="text-[15px] font-semibold">{s.title}</h3>}
          {s.description && <p className="text-muted-foreground text-[13px] leading-relaxed">{s.description}</p>}
          {s.blocks.map((b, j) => (
            <BlockView key={j} block={b} tabKey={tab.key} />
          ))}
        </section>
      ))}
    </div>
  )
}

function CssView({ css }: { css?: string }) {
  return <pre className="font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">{css}</pre>
}

/** The original HTML reference, rendered live (menu hidden) for this section. */
function LivePreview({ url, edited, onSpecs }: { url: string; edited: boolean; onSpecs: () => void }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="flex h-full flex-col gap-2">
      {edited && (
        <div className="text-muted-foreground flex items-center gap-2 text-[12px]">
          <span className="size-1.5 rounded-full bg-[var(--pin)]" />
          Showing the original. Your team's changes are in
          <button onClick={onSpecs} className="text-foreground underline underline-offset-2">
            Specs
          </button>
        </div>
      )}
      <div className="relative min-h-[480px] flex-1 overflow-hidden rounded-xl border bg-white shadow-xs">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center">
            <Spinner />
          </div>
        )}
        <iframe src={url} title="Live design-system reference" onLoad={() => setLoaded(true)} className="absolute inset-0 size-full bg-white" />
      </div>
    </div>
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
    <div className="flex flex-col gap-2.5">
      <p className="text-muted-foreground text-[12.5px] leading-relaxed">Describe what should change. Prism updates the {tab.group === "page" ? "pattern" : "component"}'s rules and its specs; the agent follows them in every project.</p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            apply()
          }
        }}
        placeholder={tab.group === "page" ? `e.g. "Put the search bar above the banner"` : `e.g. "Make primary buttons 48px tall with a 12px radius"`}
        className="min-h-[76px] resize-none text-[13px]"
        disabled={busy}
        aria-label={`Describe a change to ${tab.title}`}
      />
      <Button size="sm" className="w-fit" onClick={apply} disabled={!text.trim() || busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? "Applying…" : "Apply change"}
      </Button>
      {current && (
        <div className="bg-muted/50 mt-1 flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 text-[12.5px] font-medium">{current.summary}</div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground -mt-1 -mr-1 h-6 px-2 text-[12px]"
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
            <Markdown text={current.spec} className="mt-2 text-[12.5px] leading-relaxed" />
          </details>
        </div>
      )}
    </div>
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
