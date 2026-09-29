import { useEffect } from "react"
import { FileStack, FileText, Home, LayoutGrid, Palette, Plug, Plus, Radio, Settings2, Image as ImageIcon, Workflow as WorkflowIcon } from "lucide-react"
import { useStore, frameLabel } from "@/lib/store"
import { allDesignSystems } from "@/lib/design-systems"
import type { FrameNode, Page } from "@/lib/types"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { emitCreate } from "./dashboard-sidebar"
import { timeAgo } from "@/components/project-card"

const PAGES: { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "files", label: "Files", icon: FileStack },
  { id: "connectors", label: "Connectors", icon: Plug },
  { id: "context", label: "Context file", icon: FileText },
  { id: "design-systems", label: "Design systems", icon: Palette },
  { id: "settings", label: "Settings", icon: Settings2 },
]

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const conversations = useStore((s) => s.conversations)
  const custom = useStore((s) => s.designSystems)
  const { setRoute, openProject, focusNode } = useStore.getState()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const run = (fn: () => void) => {
    onOpenChange(false)
    fn()
  }
  const projects = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
  const frames = projects.flatMap((c) => c.canvas.nodes.filter((n): n is FrameNode => n.kind === "frame").map((f) => ({ f, c })))

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search projects, frames, pages and actions" className="sm:max-w-[600px]">
      <CommandInput placeholder="Search projects, frames, pages…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Projects">
          {projects.map((c) => (
            <CommandItem key={c.id} value={`project ${c.title} ${c.id}`} onSelect={() => run(() => openProject(c.id))}>
              <LayoutGrid />
              <span className="flex-1 truncate">{c.title}</span>
              <span className="text-muted-foreground text-xs">{timeAgo(c.updatedAt)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {frames.length > 0 && (
          <CommandGroup heading="Frames">
            {frames.slice(0, 40).map(({ f, c }) => (
              <CommandItem
                key={f.id}
                value={`frame ${frameLabel(f)} ${c.title} ${f.id}`}
                onSelect={() =>
                  run(() => {
                    openProject(c.id)
                    setTimeout(() => focusNode(f.id), 60)
                  })
                }
              >
                {f.type === "workflow" ? <WorkflowIcon /> : f.type === "wireframe" ? <LayoutGrid /> : <ImageIcon />}
                <span className="flex-1 truncate">{frameLabel(f)}</span>
                <span className="text-muted-foreground truncate text-xs">{c.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {PAGES.map((p) => (
            <CommandItem key={p.id} value={`page ${p.label}`} onSelect={() => run(() => setRoute(p.id))}>
              <p.icon /> {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Design systems">
          {allDesignSystems(custom).map((d) => (
            <CommandItem key={d.id} value={`design system ${d.name}`} onSelect={() => run(() => setRoute("design-systems"))}>
              <Palette /> {d.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem value="new project create" onSelect={() => run(() => emitCreate("blank"))}>
            <Plus /> New project
          </CommandItem>
          <CommandItem value="start live crit screen share" onSelect={() => run(() => emitCreate("live"))}>
            <Radio /> Start a live crit
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
