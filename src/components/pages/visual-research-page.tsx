import { ExternalLink } from "@/components/ui/icons"
import { VISUAL_RESEARCH_URL } from "@/lib/prism"
import { Button } from "@/components/ui/button"

/** Prism's curated screen library. The agent searches the same catalogue with its visual-research tools. */
export function VisualResearchPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b px-6 py-4 md:px-10">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-tight font-bold">Visual research</h1>
          <p className="text-muted-foreground mt-0.5 text-[13.5px]">
            300 curated app screens grouped by pattern. Prism searches this library and inspects up to five screens before a wireframe.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <a href={VISUAL_RESEARCH_URL} target="_blank" rel="noreferrer">
            <ExternalLink /> Open in a new tab
          </a>
        </Button>
      </header>
      {/* The gallery needs its own scripts (search, filters, viewer) and is our own file, so it runs same-origin. */}
      <iframe title="Visual research library" src={VISUAL_RESEARCH_URL} className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  )
}
