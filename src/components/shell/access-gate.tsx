import { useState } from "react"
import { Loader2, LockKeyhole } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { checkServer, useServer } from "@/lib/server"
import { loadServerModels } from "@/components/pages/settings-page"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/** Asks for the deployment's access code once, when the server has keys behind one. */
export function AccessGate() {
  const server = useServer()
  const patchSettings = useStore((s) => s.patchSettings)
  const [dismissed, setDismissed] = useState(false)
  const [code, setCode] = useState("")
  const [checking, setChecking] = useState(false)
  const open = server.deployed && server.accessRequired && !server.authorized && !dismissed

  const submit = async () => {
    setChecking(true)
    patchSettings({ accessCode: code.trim() })
    const s = await checkServer()
    setChecking(false)
    if (s.authorized) {
      toast.success("Unlocked")
      loadServerModels()
    } else toast.error("That code didn't work.")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDismissed(true)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="bg-muted mb-2 grid size-10 place-items-center rounded-xl border">
            <LockKeyhole className="size-5" />
          </div>
          <DialogTitle>Enter the access code</DialogTitle>
          <DialogDescription>This deployment provides AI keys for its team. Enter the code you were given to use them, or skip and add your own key in Settings.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) submit()
          }}
        >
          <Input id="gate-code" autoFocus type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" className="h-10" autoComplete="off" />
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => setDismissed(true)}>
              Use my own key
            </Button>
            <Button type="submit" disabled={!code.trim() || checking}>
              {checking && <Loader2 className="animate-spin" />}
              Unlock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
