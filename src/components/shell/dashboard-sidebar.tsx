import { ChevronDown, ImagePlus, Plus, Radio, Search } from "@/components/ui/icons"
import { FigmaLogo, TypeTile, type TileKind } from "@/components/type-icon"
import { projectKind } from "@/components/project-card"
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

type NavItem = { id: Page & TileKind; label: string }

/** What Prism reads and follows, then what it knows. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Context",
    items: [
      { id: "context", label: "Context file" },
      { id: "connectors", label: "Connectors" },
      { id: "design-systems", label: "Design systems" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { id: "prism", label: "Prism core" },
      { id: "visual-research", label: "Visual research" },
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
  const conversations = useStore((s) => s.conversations)
  const openProject = useStore((s) => s.openProject)
  const favorites = conversations.filter((c) => c.starred)
  const recents = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt).filter((c) => !c.starred).slice(0, 5)

  const projects = (label: string, list: typeof conversations) =>
    list.length > 0 && (
      <SidebarGroup className="pt-1">
        <SidebarGroupLabel className="text-muted-foreground/80 h-7 px-2.5 text-[12px] font-medium">{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {list.map((c) => (
              <SidebarMenuItem key={c.id}>
                <SidebarMenuButton onClick={() => openProject(c.id)} title={c.title} className="text-sidebar-foreground/80 hover:text-sidebar-foreground h-8 gap-2.5 rounded-lg px-2.5 text-[13px]">
                  <TypeTile kind={projectKind(c)} size={16} />
                  <span className="truncate">{c.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )

  const item = (id: Page & TileKind, label: string, extra?: React.ReactNode) => (
    <SidebarMenuItem key={id}>
      <SidebarMenuButton
        isActive={route === id}
        onClick={() => setRoute(id)}
        className="nav-item text-sidebar-foreground/80 hover:text-sidebar-foreground data-[active=true]:text-foreground h-9 gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-[background,box-shadow,color] data-[active=true]:font-semibold"
      >
        <TypeTile kind={id} size={18} />
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
              <FigmaLogo size={14} className="mx-px" /> From a Figma file
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
              {item("home", "Home")}
              {item("files", "Files")}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {NAV_GROUPS.map((g) => (
          <SidebarGroup key={g.label} className="pt-1">
            <SidebarGroupLabel className="text-muted-foreground/80 h-7 px-2.5 text-[12px] font-medium">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">{g.items.map((n) => item(n.id, n.label))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {projects("Favorites", favorites)}
        {projects("Recents", recents)}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <SidebarMenu>
          {item(
            "settings",
            "Settings",
            <span className={cn("size-2 rounded-full", connected ? "bg-ok" : "bg-muted-foreground/40")} aria-hidden title={connected ? "API key connected" : "No API key yet"} />,
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
