// From beUI's Todo List: beui.dev/components/agents/todo-list (status colors mapped to studio tokens)
import { ChevronDown, ListTodo } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { ActionSwapRollText } from "@/components/motion/action-swap"
import { AgentDisclosure } from "./agent-disclosure"
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease"
import { cn } from "@/lib/utils"

export type TodoItemStatus = "pending" | "in-progress" | "completed" | "cancelled"

export interface TodoItem {
  id: string
  title: ReactNode
  status?: TodoItemStatus
  progress?: number
  detail?: ReactNode
}

export interface TodoListProps {
  items: TodoItem[]
  title?: ReactNode
  defaultOpen?: boolean
  collapseOnComplete?: boolean
  maxHeight?: number
  className?: string
}

function label(s: TodoItemStatus) {
  if (s === "in-progress") return "In progress"
  if (s === "completed") return "Completed"
  if (s === "cancelled") return "Cancelled"
  return "Pending"
}

function HeaderIcon({ complete }: { complete: boolean }) {
  const reduce = useReducedMotion() ?? false
  return (
    <span aria-hidden className="relative grid size-6 shrink-0 place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        {complete ? (
          <motion.svg key="complete" viewBox="0 0 24 24" initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.72 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={reduce ? { duration: 0 } : SPRING_SWAP} className="text-ok absolute size-5.5 overflow-visible">
            <circle cx="12" cy="12" r="9" fill="currentColor" />
            <motion.path d="M7.5 12.25 10.5 15.25 16.75 8.75" fill="none" stroke="white" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" initial={reduce ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={reduce ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT }} />
          </motion.svg>
        ) : (
          <motion.span key="todo" initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.72 }} transition={reduce ? { duration: 0 } : SPRING_SWAP} className="text-muted-foreground absolute grid place-items-center">
            <ListTodo className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

function StatusIcon({ status, progress }: { status: TodoItemStatus; progress?: number }) {
  const reduce = useReducedMotion() ?? false
  const p = progress === undefined ? 0.68 : Math.min(100, Math.max(0, progress)) / 100
  const spinning = status === "in-progress" && progress === undefined && !reduce
  return (
    <motion.svg aria-hidden viewBox="0 0 24 24" initial={false} className={cn("text-muted-foreground mx-0.5 size-5 shrink-0 overflow-visible", status === "in-progress" && "text-ember", status === "completed" && "text-ok", status === "cancelled" && "text-destructive")}>
      <motion.circle cx="12" cy="12" r="9" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeDasharray={status === "pending" ? "2 3" : undefined} strokeLinecap="round" initial={false} animate={{ fillOpacity: status === "completed" ? 0.1 : 0 }} transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE_OUT }} className={cn(status === "in-progress" && "opacity-20")} />
      <motion.circle
        cx="12"
        cy="12"
        r="9"
        pathLength="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: status === "in-progress" ? p : 0, opacity: status === "in-progress" ? 1 : 0, rotate: spinning ? 360 : -90 }}
        transition={spinning ? { rotate: { duration: 1.1, repeat: Infinity, ease: "linear" } } : reduce ? { duration: 0 } : SPRING_LAYOUT}
        style={{ transformOrigin: "12px 12px" }}
      />
      <motion.path d="M7.5 12.25 10.5 15.25 16.75 8.75" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: status === "completed" ? 1 : 0, opacity: status === "completed" ? 1 : 0 }} transition={reduce ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT }} />
      <motion.path d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" initial={false} animate={{ pathLength: status === "cancelled" ? 1 : 0, opacity: status === "cancelled" ? 1 : 0 }} transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }} />
    </motion.svg>
  )
}

export function TodoList({ items, title = "To-dos", defaultOpen = true, collapseOnComplete = true, maxHeight = 248, className }: TodoListProps) {
  const reduce = useReducedMotion() ?? false
  const baseId = useId()
  const viewport = useRef<HTMLDivElement>(null)
  const wasComplete = useRef(false)
  const [open, setOpenState] = useState(defaultOpen)
  const completed = items.filter((i) => i.status === "completed").length
  const allComplete = items.length > 0 && completed === items.length
  const setOpen = useCallback((n: boolean) => setOpenState(n), [])

  useEffect(() => {
    if (wasComplete.current && !allComplete) setOpen(true)
    if (!wasComplete.current && allComplete && collapseOnComplete) setOpen(false)
    wasComplete.current = allComplete
  }, [allComplete, collapseOnComplete, setOpen])

  useLayoutEffect(() => {
    const v = viewport.current
    if (!v || !items.length) return
    const f = requestAnimationFrame(() => {
      if (v.scrollHeight > v.clientHeight) v.scrollTo({ top: v.scrollHeight, behavior: reduce ? "auto" : "smooth" })
    })
    return () => cancelAnimationFrame(f)
  }, [items.length, reduce])

  return (
    <section aria-label="Agent task list" className={cn("bg-card w-full overflow-hidden rounded-2xl border", className)}>
      <button id={`${baseId}-t`} type="button" aria-expanded={open} aria-controls={`${baseId}-c`} onClick={() => setOpen(!open)} className="group focus-visible:ring-ring flex h-11 w-full items-center gap-2.5 rounded-2xl px-3.5 text-left outline-none focus-visible:ring-2">
        <HeaderIcon complete={allComplete} />
        <h3 className="text-foreground/90 min-w-0 flex-1 truncate font-sans text-sm font-medium tracking-normal">{title}</h3>
        <span className={cn("text-muted-foreground shrink-0 text-xs font-medium tabular-nums", allComplete && "text-ok")}>
          <span className="sr-only">
            {completed} of {items.length} tasks completed
          </span>
          <span aria-hidden className="inline-flex">
            <ActionSwapRollText value={String(completed)}>{completed}</ActionSwapRollText>
            <span>/</span>
            <span>{items.length}</span>
          </span>
        </span>
        <motion.span aria-hidden animate={{ rotate: open ? 180 : 0 }} transition={reduce ? { duration: 0 } : SPRING_SWAP} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>
      <AgentDisclosure id={`${baseId}-c`} role="region" aria-labelledby={`${baseId}-t`} open={open}>
        <div ref={viewport} className="scrollbar-hide overflow-y-auto px-2 pb-2" style={{ maxHeight }} data-scrollable>
          {items.length ? (
            <ol aria-live="polite">
              <AnimatePresence initial={false} mode="popLayout">
                {items.map((item) => {
                  const status = item.status ?? "pending"
                  return (
                    <motion.li
                      layout="position"
                      key={item.id}
                      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3 }}
                      transition={reduce ? { duration: 0 } : { opacity: { duration: 0.18, ease: EASE_OUT }, y: SPRING_LAYOUT, layout: SPRING_LAYOUT }}
                      className="flex min-h-9 items-center gap-2.5 rounded-xl px-1.5 py-1"
                    >
                      <StatusIcon status={status} progress={item.progress} />
                      <span className="sr-only">{label(status)}: </span>
                      <span className={cn("min-w-0 flex-1 truncate text-sm leading-5", status === "pending" && "text-muted-foreground/70", status === "in-progress" && "text-foreground", (status === "completed" || status === "cancelled") && "text-muted-foreground/65")}>
                        <span className="relative inline-block max-w-full">
                          {item.title}
                          <motion.span aria-hidden initial={false} animate={{ scaleX: status === "completed" ? 1 : 0, opacity: status === "completed" ? 1 : 0 }} transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT, delay: 0.06 }} className="absolute inset-x-0 top-1/2 h-px origin-left bg-current" />
                        </span>
                      </span>
                      {item.detail ? <span className="text-muted-foreground/60 shrink-0 text-xs">{item.detail}</span> : null}
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ol>
          ) : (
            <p className="text-muted-foreground px-1.5 py-2 text-sm">No tasks yet</p>
          )}
        </div>
      </AgentDisclosure>
    </section>
  )
}
