import { useState } from "react"
import { Check, ChevronDown, Eye, KeyRound, FlaskConical } from "lucide-react"
import { useStore } from "@/lib/store"
import { PROVIDERS, PROVIDER_ORDER } from "@/lib/providers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** The searchable model list, shared by the composer's + menu. */
export function ModelList({ onPicked }: { onPicked?: () => void }) {
  const settings = useStore((s) => s.settings)
  const patch = useStore((s) => s.patchSettings)
  const openSettings = useStore((s) => s.setSettingsOpen)
  const sel = settings.selectedModel
  const connected = PROVIDER_ORDER.filter((p) => settings.providers[p].status === "ok" && settings.providers[p].models.length)
  const pick = (provider: typeof sel.provider, id: string, name: string) => {
    patch({ selectedModel: { provider, id, name } })
    onPicked?.()
  }
  return (
    <Command>
      <CommandInput placeholder="Search models…" onKeyDown={(e) => e.stopPropagation()} />
      <CommandList className="max-h-[340px]">
        <CommandEmpty>No models match.</CommandEmpty>
        {connected.map((p) => (
          <CommandGroup key={p} heading={`${PROVIDERS[p].vendor}${p === "custom" && settings.providers.custom.label ? ` · ${settings.providers.custom.label}` : ""} · ${settings.providers[p].models.length}`}>
            {settings.providers[p].models.map((m) => (
              <CommandItem key={`${p}:${m.id}`} value={`${p} ${m.name} ${m.id}`} onSelect={() => pick(p, m.id, m.name)}>
                <Check className={cn("size-3.5", sel.provider === p && sel.id === m.id ? "opacity-100" : "opacity-0")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]">{m.name}</div>
                  {m.name !== m.id && <div className="text-muted-foreground truncate font-mono text-[10.5px]">{m.id}</div>}
                </div>
                {m.vision && <Eye className="text-muted-foreground size-3.5" aria-label="Reads images" />}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {connected.length > 0 && <CommandSeparator />}
        <CommandGroup heading="Offline">
          <CommandItem value="demo offline agent" onSelect={() => pick("demo", "demo", "Demo agent (offline)")}>
            <Check className={cn("size-3.5", sel.provider === "demo" ? "opacity-100" : "opacity-0")} />
            <div className="flex-1">
              <div className="text-[13px]">Demo agent</div>
              <div className="text-muted-foreground text-[11px]">Scripted, no key needed</div>
            </div>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem
            value="add api key settings"
            onSelect={() => {
              onPicked?.()
              openSettings(true)
            }}
          >
            <KeyRound className="size-3.5" />
            {connected.length ? "Manage API keys" : "Add an API key to load models"}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

export function ModelPicker({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const settings = useStore((s) => s.settings)
  const patch = useStore((s) => s.patchSettings)
  const openSettings = useStore((s) => s.setSettingsOpen)
  const sel = settings.selectedModel
  const connected = PROVIDER_ORDER.filter((p) => settings.providers[p].status === "ok" && settings.providers[p].models.length)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("text-muted-foreground hover:text-foreground h-8 max-w-[150px] gap-1 px-2 text-[12.5px] font-medium", className)}>
          {sel.provider === "demo" ? <FlaskConical className="size-3.5" /> : null}
          <span className="truncate">{sel.name}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end" side="top">
        <Command>
          <CommandInput placeholder="Search models…" />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>No models match.</CommandEmpty>
            {connected.map((p) => (
              <CommandGroup key={p} heading={`${PROVIDERS[p].vendor}${p === "custom" && settings.providers.custom.label ? ` · ${settings.providers.custom.label}` : ""} · ${settings.providers[p].models.length}`}>
                {settings.providers[p].models.map((m) => (
                  <CommandItem
                    key={`${p}:${m.id}`}
                    value={`${p} ${m.name} ${m.id}`}
                    onSelect={() => {
                      patch({ selectedModel: { provider: p, id: m.id, name: m.name } })
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("size-3.5", sel.provider === p && sel.id === m.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]">{m.name}</div>
                      {m.name !== m.id && <div className="text-muted-foreground truncate font-mono text-[10.5px]">{m.id}</div>}
                    </div>
                    {m.vision && <Eye className="text-muted-foreground size-3.5" aria-label="Reads images" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {connected.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Offline">
              <CommandItem
                value="demo offline agent"
                onSelect={() => {
                  patch({ selectedModel: { provider: "demo", id: "demo", name: "Demo agent (offline)" } })
                  setOpen(false)
                }}
              >
                <Check className={cn("size-3.5", sel.provider === "demo" ? "opacity-100" : "opacity-0")} />
                <div className="flex-1">
                  <div className="text-[13px]">Demo agent</div>
                  <div className="text-muted-foreground text-[11px]">Scripted, no key needed. Shows how the canvas tools work.</div>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="add api key settings"
                onSelect={() => {
                  setOpen(false)
                  openSettings(true)
                }}
              >
                <KeyRound className="size-3.5" />
                {connected.length ? "Manage API keys" : "Add an API key to load models"}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
