import { ChevronDown, FileStack, FileText, GalleryHorizontalEnd, Home, ImagePlus, Palette, Plug, Plus, Radio, Search, Settings2, Shapes as Figma, Triangle } from "lucide-react"
import { useStore } from "@/lib/store"
import { PROVIDER_ORDER } from "@/lib/providers"
import type { Page } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const NAV: { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "files", label: "Files", icon: FileStack },
  { id: "connectors", label: "Connectors", icon: Plug },
  { id: "context", label: "Context file", icon: FileText },
  { id: "prism", label: "Prism", icon: Triangle },
  { id: "design-systems", label: "Design systems", icon: Palette },
  { id: "visual-research", label: "Visual research", icon: GalleryHorizontalEnd },
]

/** Things the Create menu can start. Home listens for these. */
export type CreateAction = "blank" | "screenshots" | "figma" | "live"
export const emitCreate = (a: CreateAction) => window.dispatchEvent(new CustomEvent("das:create", { detail: a }))

export function DashboardSidebar({ onSearch }: { onSearch: () => void }) {
  const route = useStore((s) => s.route)
  const setRoute = useStore((s) => s.setRoute)
  const settings = useStore((s) => s.settings)
  const connected = PROVIDER_ORDER.some((p) => settings.providers[p].status === "ok")

  const item = (id: Page, label: string, Icon: React.ComponentType<{ className?: string }>, extra?: React.ReactNode) => (
    <SidebarMenuItem key={id}>
      <SidebarMenuButton isActive={route === id} onClick={() => setRoute(id)} className="h-9 gap-2.5 rounded-lg px-2.5 text-[13.5px] data-[active=true]:font-medium">
        <Icon className="size-4" />
        <span className="flex-1">{label}</span>
        {extra}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )

  return (
    <Sidebar variant="inset" className="border-r-0">
      <SidebarHeader className="gap-3 px-3 pt-3">
        <div className="flex h-9 items-center gap-2 px-2">
          <span className="font-display text-[17px] font-bold whitespace-nowrap tracking-[-0.02em]">Design Agent</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-background h-10 w-full justify-center gap-1.5 rounded-xl text-[13.5px] font-medium shadow-xs">
              <Plus /> Create <ChevronDown className="text-muted-foreground size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl p-1.5">
            <DropdownMenuItem className="rounded-lg py-2" onSelect={() => emitCreate("blank")}>
              <Plus /> New project
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg py-2" onSelect={() => emitCreate("screenshots")}>
              <ImagePlus /> From screenshots
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg py-2" onSelect={() => emitCreate("figma")}>
              <Figma /> From a Figma file
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg py-2" onSelect={() => emitCreate("live")}>
              <Radio /> Start a live crit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onSearch} className="text-muted-foreground hover:text-foreground h-9 gap-2.5 rounded-lg px-2.5 text-[13.5px]">
                  <Search className="size-4" />
                  <span className="flex-1">Search</span>
                  <Kbd className="text-[10.5px]">⌘K</Kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {item("home", "Home", Home)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-3" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{NAV.map((n) => item(n.id, n.label, n.icon))}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <SidebarMenu>
          {item(
            "settings",
            "Settings",
            Settings2,
            <span className={cn("size-2 rounded-full", connected ? "bg-ok" : "bg-muted-foreground/40")} aria-hidden title={connected ? "API key connected" : "No API key yet"} />,
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
