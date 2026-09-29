import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import type { FrameNode } from "@/lib/types"
import { frameLabel, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ProjectCollection } from "./home-page"
import { FrameMini, timeAgo } from "@/components/project-card"
import { PageHeader } from "./page-header"

export function FilesPage() {
  const [tab, setTab] = useState<"projects" | "assets">("projects")
  const newConversation = useStore((s) => s.newConversation)
  return (
    <div className="h-full overflow-y-auto" data-scrollable>
      <div className="mx-auto max-w-[1180px] px-6 md:px-10">
        <PageHeader
          title="Files"
          description="Every project you've started, and every screenshot, wireframe and flow inside them."
          action={
            <Button className="rounded-full" onClick={() => newConversation()}>
              <Plus /> New project
            </Button>
          }
        />
        <div className="mb-6 flex gap-1 border-b">
          {(["projects", "assets"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-[14px] font-medium capitalize transition-colors", tab === t ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground border-transparent")}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "projects" ? <ProjectCollection title="All projects" /> : <Assets />}
      </div>
    </div>
  )
}

function Assets() {
  const conversations = useStore((s) => s.conversations)
  const { openProject, focusNode } = useStore.getState()
  const [type, setType] = useState<"all" | FrameNode["type"]>("all")
  const items = useMemo(
    () =>
      conversations
        .flatMap((c) => c.canvas.nodes.filter((n): n is FrameNode => n.kind === "frame").map((f) => ({ f, c })))
        .filter(({ f }) => type === "all" || f.type === type)
        .sort((a, b) => b.f.createdAt - a.f.createdAt),
    [conversations, type],
  )
  const LABEL = { all: "All", image: "Screenshots", wireframe: "Wireframes", workflow: "Flows" } as const
  return (
    <section className="pb-16">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(Object.keys(LABEL) as (keyof typeof LABEL)[]).map((k) => (
          <button key={k} onClick={() => setType(k)} className={cn("h-8 rounded-full border px-3 text-[13px] font-medium transition-colors", type === k ? "bg-foreground text-background border-foreground" : "hover:bg-accent")}>
            {LABEL[k]}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed px-6 py-14 text-center text-[13.5px]">Nothing here yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map(({ f, c }) => (
            <button
              key={f.id}
              onClick={() => {
                openProject(c.id)
                setTimeout(() => focusNode(f.id), 60)
              }}
              className="group flex flex-col gap-2 text-left"
            >
              <div className="bg-muted flex h-44 items-center justify-center overflow-hidden rounded-xl border p-3 transition-shadow group-hover:shadow-md">
                <FrameMini f={f} height={150} />
              </div>
              <div className="min-w-0 px-0.5">
                <div className="truncate text-[13px] font-medium">{frameLabel(f)}</div>
                <div className="text-muted-foreground truncate text-[11.5px]">
                  {c.title} · {timeAgo(f.createdAt)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
