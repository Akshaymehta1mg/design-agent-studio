import { useEffect, useState } from "react"
import { GalleryHorizontalEnd, Palette, Plug } from "@/components/ui/icons"
import { loadPrismDoc, PRISM_CORE, PRISM_DOCS } from "@/lib/prism"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/chat/markdown"
import { Spinner } from "@/components/ui/spinner"

const CORE = "core"
const label = (name: string) => (name === CORE ? "Core rules" : name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()))

/** Read-only view of Prism core: the rules the agent follows on every brief, and the references it loads on demand. */
export function PrismPage() {
  const setRoute = useStore((s) => s.setRoute)
  const mobbin = useStore((s) => s.connectors.some((c) => c.catalogId === "mobbin" && c.enabled && c.status === "ok"))
  const [doc, setDoc] = useState(CORE)
  const [text, setText] = useState<string | null>(PRISM_CORE)

  useEffect(() => {
    if (doc === CORE) return setText(PRISM_CORE)
    let live = true
    setText(null)
    loadPrismDoc(doc).then((t) => live && setText(t ?? "Not found."))
    return () => {
      live = false
    }
  }, [doc])

  const links = [
    { icon: Palette, title: "Design system", body: "Tata 1mg Dopamine, the default for every project", to: "design-systems" as const },
    { icon: GalleryHorizontalEnd, title: "Visual research", body: "300 curated screens Prism searches before wireframing", to: "visual-research" as const },
    { icon: Plug, title: mobbin ? "Mobbin connected" : "Connect Mobbin", body: mobbin ? "Prism runs its Mobbin reference pass" : "Needed for Prism's Mobbin reference pass", to: "connectors" as const },
  ]

  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto max-w-[1180px] px-6 pb-16 md:px-10">
        <header className="pt-10 pb-6">
          <h1 className="text-[30px] leading-tight font-bold">Prism core</h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl text-[14.5px] leading-relaxed">
            The design agent's operating rules. Prism core applies to every brief; its references load only when a step needs them. It reads the design system and visual research from their own pages.
          </p>
        </header>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {links.map((l) => (
            <button key={l.title} onClick={() => setRoute(l.to)} className="bg-card hover:bg-accent/50 flex items-start gap-3 rounded-2xl border p-4 text-left shadow-xs transition-colors">
              <l.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-[14px] font-semibold">{l.title}</span>
                <span className="text-muted-foreground block text-[12.5px] leading-snug">{l.body}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <nav className="flex flex-col gap-0.5 lg:sticky lg:top-6 lg:self-start" aria-label="Prism documents">
            {[CORE, ...PRISM_DOCS].map((name) => (
              <button
                key={name}
                onClick={() => setDoc(name)}
                className={cn("rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors", doc === name ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}
              >
                {label(name)}
              </button>
            ))}
          </nav>
          <article className="bg-card min-w-0 rounded-2xl border p-6 shadow-xs">
            {text === null ? <Spinner /> : <Markdown text={text} className="text-[14px] leading-relaxed" />}
          </article>
        </div>
      </div>
    </div>
  )
}
