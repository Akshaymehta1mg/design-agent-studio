import { useEffect, useState } from "react"
import { useStore } from "@/lib/store"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function RenameDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const conv = useStore((s) => s.conversations.find((c) => c.id === id))
  const rename = useStore((s) => s.renameConversation)
  const [name, setName] = useState("")
  useEffect(() => setName(conv?.title ?? ""), [conv?.title, id])
  const save = () => {
    if (id && name.trim()) rename(id, name.trim())
    onClose()
  }
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Input id="rename-project" autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
