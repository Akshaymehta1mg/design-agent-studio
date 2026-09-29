import { useEffect, useState } from "react"
import { useStore } from "@/lib/store"
import { startProject } from "@/lib/start-project"
import { DashboardSidebar, type CreateAction } from "@/components/shell/dashboard-sidebar"
import { SearchDialog } from "@/components/shell/search-dialog"
import { HomePage } from "@/components/pages/home-page"
import { FilesPage } from "@/components/pages/files-page"
import { ConnectorsPage } from "@/components/pages/connectors-page"
import { ContextPage } from "@/components/pages/context-page"
import { DesignSystemsPage } from "@/components/pages/design-systems-page"
import { SettingsPage } from "@/components/pages/settings-page"
import { ProjectView } from "@/components/project/project-view"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { checkServer } from "@/lib/server"
import { loadServerModels } from "@/components/pages/settings-page"
import { AccessGate } from "@/components/shell/access-gate"

function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      // An explicit choice here sets data-theme; "system" leaves any host-set value alone.
      if (theme !== "system") root.setAttribute("data-theme", theme)
      else if (root.dataset.themeOwner === "app") root.removeAttribute("data-theme")
      root.dataset.themeOwner = theme === "system" ? "" : "app"
      const attr = root.getAttribute("data-theme")
      root.classList.toggle("dark", attr ? attr === "dark" : mq.matches)
    }
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [theme])
}

/** The sidebar's Create menu and ⌘K actions. */
function useCreateActions() {
  useEffect(() => {
    const onCreate = (e: Event) => {
      const a = (e as CustomEvent<CreateAction>).detail
      const s = useStore.getState()
      if (a === "blank") s.newConversation()
      else if (a === "live") startProject({ text: "", mode: "live" })
      else {
        // screenshots / figma are picked in the Home composer
        if (s.route !== "home") s.setRoute("home")
        setTimeout(() => window.dispatchEvent(new CustomEvent("das:create-home", { detail: a })), 60)
      }
    }
    window.addEventListener("das:create", onCreate)
    return () => window.removeEventListener("das:create", onCreate)
  }, [])
}

export default function App() {
  useTheme()
  useCreateActions()
  const route = useStore((s) => s.route)
  const hydrated = useStore((s) => s.hydrated)
  const hasProject = useStore((s) => s.conversations.length > 0)

  // On Vercel, find out which keys the server provides and load their models.
  useEffect(() => {
    if (hydrated) checkServer().then(() => loadServerModels())
  }, [hydrated])
  const [search, setSearch] = useState(false)

  const page =
    route === "home" ? <HomePage /> : route === "files" ? <FilesPage /> : route === "connectors" ? <ConnectorsPage /> : route === "context" ? <ContextPage /> : route === "design-systems" ? <DesignSystemsPage /> : route === "settings" ? <SettingsPage /> : <HomePage />

  return (
    <TooltipProvider delayDuration={300}>
      {!hydrated ? null : route === "project" && hasProject ? (
        <ProjectView />
      ) : (
        <SidebarProvider style={{ "--sidebar-width": "16.5rem" } as React.CSSProperties} className="h-full min-h-0">
          <DashboardSidebar onSearch={() => setSearch(true)} />
          <SidebarInset className="min-h-0 overflow-hidden md:peer-data-[variant=inset]:shadow-xs">
            <div className="absolute top-3 left-3 z-10 md:hidden">
              <SidebarTrigger />
            </div>
            {page}
          </SidebarInset>
        </SidebarProvider>
      )}
      <SearchDialog open={search} onOpenChange={setSearch} />
      <AccessGate />
      <Toaster position="bottom-center" />
    </TooltipProvider>
  )
}
