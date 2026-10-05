import { ChevronDown, FileStack, FileText, GalleryHorizontalEnd, Home, ImagePlus, Palette, Plug, Plus, Radio, Search, Settings2, Shapes as Figma, Triangle } from "@/components/ui/icons"
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type NavItem = { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }

/** Your material, then what Prism knows and follows. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { id: "files", label: "Files", icon: FileStack },
      { id: "context", label: "Context file", icon: FileText },
      { id: "connectors", label: "Connectors", icon: Plug },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { id: "prism", label: "Prism core", icon: Triangle },
      { id: "design-systems", label: "Design systems", icon: Palette },
      { id: "visual-research", label: "Visual research", icon: GalleryHorizontalEnd },
    ],
  },
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
      <SidebarMenuButton
        isActive={route === id}
        onClick={() => setRoute(id)}
        className="nav-item text-sidebar-foreground/80 hover:text-sidebar-foreground data-[active=true]:text-foreground h-9 gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-[background,box-shadow,color] data-[active=true]:font-semibold"
      >
        <Icon className="size-4" />
        <span className="flex-1">{label}</span>
        {extra}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )

  return (
    <Sidebar variant="inset" className="border-r-0">
      <SidebarHeader className="gap-3 px-3 pt-3">
        <div className="flex h-10 items-center px-2">
          <span className="font-display text-[20px] font-extrabold whitespace-nowrap tracking-[-0.035em]">Prism</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-10 w-full justify-center gap-1.5 rounded-xl text-[13.5px] font-semibold shadow-sm">
              <Plus /> Create <ChevronDown className="size-3.5 opacity-70" />
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
                <SidebarMenuButton onClick={onSearch} className="text-muted-foreground hover:text-foreground bg-background/60 h-9 gap-2.5 rounded-lg border px-2.5 text-[13.5px] shadow-xs">
                  <Search className="size-4" />
                  <span className="flex-1">Search</span>
                  <Kbd className="text-[10.5px]">⌘K</Kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {item("home", "Home", Home)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {NAV_GROUPS.map((g) => (
          <SidebarGroup key={g.label} className="pt-1">
            <SidebarGroupLabel className="text-muted-foreground/80 h-7 px-2.5 text-[12px] font-medium">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">{g.items.map((n) => item(n.id, n.label, n.icon))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
