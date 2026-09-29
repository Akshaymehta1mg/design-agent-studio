import { toast } from "sonner"
import type { Attachment, ChatMessage, Mode } from "./types"
import { frameLabel, uid, useStore } from "./store"
import { addImageFiles } from "./canvas-actions"
import { runChat } from "./agent"
import { loadFigmaIntoConversation } from "@/components/chat/figma-popover"

export interface StartInput {
  text: string
  images?: File[]
  files?: Extract<Attachment, { kind: "file" }>[]
  figma?: { url: string; allowComments: boolean }
  designSystemId?: string
  mode?: Mode
}

/** Create a project from the home composer, put everything on its canvas, and send the first message. */
export async function startProject(input: StartInput) {
  const s = useStore.getState()
  const id = s.newConversation()
  s.updateConversation(id, (c) => ({ ...c, designSystemId: input.designSystemId ?? s.defaultDesignSystemId }))
  if (input.mode) useStore.setState({ mode: input.mode })

  let frameIds: string[] = []
  if (input.images?.length) frameIds = await addImageFiles(id, input.images)
  if (input.figma) {
    try {
      await loadFigmaIntoConversation(id, input.figma.url, input.figma.allowComments)
      frameIds = [...frameIds, ...useStore.getState().selection.filter((x) => !frameIds.includes(x))]
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const text = input.text.trim()
  if (!text) return id

  const conv = useStore.getState().conversations.find((c) => c.id === id)!
  const product = useStore.getState().product
  const productReady = product.useInConversations && !!(product.about || product.screens.length || product.brief)
  const frames = conv.canvas.nodes.filter((n) => n.kind === "frame" && frameIds.includes(n.id))
  const attachments: Attachment[] = [
    ...frames.map((f) => ({ kind: "frame" as const, frameId: f.id, title: f.kind === "frame" ? frameLabel(f) : "" })),
    ...(input.files ?? []),
    ...(conv.figma ? [{ kind: "figma" as const, url: conv.figma.url, fileKey: conv.figma.fileKey, nodeId: conv.figma.nodeId, title: conv.figma.fileName ?? "Figma file" }] : []),
    ...(productReady ? [{ kind: "product" as const, title: "Context file" }] : []),
  ]
  const msg: ChatMessage = { id: uid("c_"), role: "user", text, attachments, createdAt: Date.now(), status: "done" }
  useStore.getState().addMessage(msg, id)
  runChat(id, msg)
  return id
}
