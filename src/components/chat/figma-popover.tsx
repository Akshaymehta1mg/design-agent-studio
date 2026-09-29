import { useEffect, useState } from "react"
import { Loader2 } from "@/components/ui/icons"
import { toast } from "sonner"
import { useActiveConversation, useStore } from "@/lib/store"
import { parseFigmaUrl, listFrames, exportFrames, hasFigmaAccess } from "@/lib/figma"
import { addImages } from "@/lib/canvas-actions"
import { loadImage } from "@/lib/files"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export async function loadFigmaIntoConversation(convId: string, url: string, allowComments: boolean) {
  const parsed = parseFigmaUrl(url)
  if (!parsed) throw new Error("That doesn't look like a Figma file link. Copy it from Share → Copy link in Figma.")
  const { settings, updateConversation, setSettingsOpen } = useStore.getState()
  const link = { url, fileKey: parsed.fileKey, nodeId: parsed.nodeId, fileName: parsed.fileName, allowComments }
  updateConversation(convId, (c) => ({ ...c, figma: link }))
  if (!hasFigmaAccess(settings.figmaToken)) {
    toast("Figma link saved", {
      description: "Add a Figma token in Settings so the agent can read frames and leave comments.",
      action: { label: "Settings", onClick: () => setSettingsOpen(true) },
    })
    return 0
  }
  const { fileName, frames } = await listFrames(parsed.fileKey, parsed.nodeId, settings.figmaToken)
  updateConversation(convId, (c) => ({ ...c, figma: { ...link, fileName } }))
  if (!frames.length) {
    toast("No frames found", { description: "Link to a specific frame or a page that has top-level frames." })
    return 0
  }
  const picked = frames.slice(0, 8)
  const images = await exportFrames(parsed.fileKey, picked.map((f) => f.id), settings.figmaToken, picked[0].w > 1000 ? 1 : 2)
  const items = await Promise.all(
    picked
      .filter((f) => images[f.id])
      .map(async (f) => {
        let w = f.w,
          h = f.h
        try {
          const img = await loadImage(images[f.id])
          w = img.naturalWidth
          h = img.naturalHeight
        } catch {
          /* keep Figma's bounds */
        }
        return { src: images[f.id], w, h, title: f.name, figma: { fileKey: parsed.fileKey, nodeId: f.id } }
      }),
  )
  await addImages(convId, items, "figma")
  if (frames.length > picked.length) toast(`Imported ${picked.length} of ${frames.length} frames`, { description: "Link to a specific frame to import others." })
  return items.length
}

export function FigmaDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick?: (url: string, allowComments: boolean) => void }) {
  // Home uses this dialog (with onPick) before any project exists.
  const conv = useActiveConversation() as ReturnType<typeof useActiveConversation> | undefined
  const token = useStore((s) => (hasFigmaAccess(s.settings.figmaToken) ? s.settings.figmaToken || "server" : ""))
  const openSettings = useStore((s) => s.setSettingsOpen)
  const update = useStore((s) => s.updateConversation)
  const [url, setUrl] = useState("")
  const [allow, setAllow] = useState(false)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (open) {
      setUrl(onPick ? "" : conv?.figma?.url ?? "")
      setAllow(onPick ? false : conv?.figma?.allowComments ?? false)
    }
  }, [open, conv?.figma, onPick])

  const load = async () => {
    if (onPick) {
      if (!parseFigmaUrl(url)) return toast.error("That doesn't look like a Figma file link. Copy it from Share → Copy link in Figma.")
      onPick(url.trim(), allow)
      onOpenChange(false)
      return
    }
    setLoading(true)
    try {
      if (!conv) return
      const n = await loadFigmaIntoConversation(conv.id, url, allow)
      if (n) toast.success(`Added ${n} frame${n === 1 ? "" : "s"} from Figma`)
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Link a Figma file</DialogTitle>
          <DialogDescription>The agent reads the file's frames and puts them on the canvas. Link to a frame or section to import just that part.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (url.trim()) load()
          }}
        >
          <div className="flex gap-2">
            <Input id="figma-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.figma.com/design/…" className="h-10" autoFocus />
            <Button type="submit" disabled={!url.trim() || loading} className="h-10">
              {loading ? <Loader2 className="animate-spin" /> : "Load"}
            </Button>
          </div>
          {!token && (
            <p className="text-muted-foreground -mt-2 text-[12.5px]">
              Reading frames needs a Figma token.{" "}
              <button
                type="button"
                className="text-foreground underline underline-offset-2"
                onClick={() => {
                  onOpenChange(false)
                  openSettings(true)
                }}
              >
                Add one in Settings
              </button>
            </p>
          )}
          <div className="flex items-center gap-2.5">
            <Switch
              id="figma-comments"
              checked={allow}
              onCheckedChange={(v) => {
                setAllow(v)
                if (conv?.figma && !onPick) update(conv.id, (c) => ({ ...c, figma: c.figma ? { ...c.figma, allowComments: v } : c.figma }))
              }}
            />
            <Label htmlFor="figma-comments" className="text-[13.5px] font-normal">
              Let the agent leave comments in this file
            </Label>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
