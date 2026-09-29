import { Check, Eye, KeyRound } from "@/components/ui/icons"
import { useStore } from "@/lib/store"
import { PROVIDERS, PROVIDER_ORDER } from "@/lib/providers"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
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
