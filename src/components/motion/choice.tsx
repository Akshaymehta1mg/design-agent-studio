// From beUI: beui.dev (motion/checkbox, motion/radio)
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react"
import { createContext, useCallback, useContext, useId, useMemo, useState, type ReactNode } from "react"
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease"
import { cn } from "@/lib/utils"

// ───────── checkbox ─────────
export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
}) {
  const id = useId()
  const reduce = useReducedMotion()
  return (
    <label htmlFor={id} className={cn("inline-flex items-center gap-3", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
      <motion.button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
        transition={SPRING_PRESS}
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-200 outline-none",
          "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 bg-background hover:border-muted-foreground",
        )}
      >
        <AnimatePresence initial={false}>
          {checked ? (
            <motion.svg
              key="checked"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
              transition={reduce ? { duration: 0 } : { duration: 0.16, ease: EASE_OUT }}
              aria-hidden
            >
              <motion.path d="M5 13l4 4L19 7" initial={reduce ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT, delay: 0.04 }} />
            </motion.svg>
          ) : null}
        </AnimatePresence>
      </motion.button>
      {label ? <span className={cn("text-foreground text-sm select-none", disabled && "opacity-60")}>{label}</span> : null}
    </label>
  )
}

// ───────── radio ─────────
type RadioCtx = { value: string; setValue: (v: string) => void; layoutId: string }
const Ctx = createContext<RadioCtx | null>(null)

export function RadioGroup({ value, defaultValue = "", onValueChange, children, className }: { value?: string; defaultValue?: string; onValueChange?: (v: string) => void; children: ReactNode; className?: string }) {
  const [internal, setInternal] = useState(defaultValue)
  const layoutId = useId()
  const reduce = useReducedMotion()
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const setValue = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next)
      onValueChange?.(next)
    },
    [controlled, onValueChange],
  )
  const ctx = useMemo(() => ({ value: current, setValue, layoutId }), [current, setValue, layoutId])
  return (
    <MotionConfig transition={reduce ? { duration: 0 } : SPRING_LAYOUT}>
      <Ctx.Provider value={ctx}>
        <div role="radiogroup" className={cn("flex flex-col gap-3", className)}>
          {children}
        </div>
      </Ctx.Provider>
    </MotionConfig>
  )
}

export function RadioGroupItem({ value, label, disabled, className }: { value: string; label?: string; disabled?: boolean; className?: string }) {
  const ctx = useContext(Ctx)!
  const id = useId()
  const reduce = useReducedMotion()
  const selected = ctx.value === value
  return (
    <label htmlFor={id} className={cn("inline-flex items-center gap-3", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
      <motion.button
        id={id}
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={() => !disabled && ctx.setValue(value)}
        whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
        transition={SPRING_PRESS}
        className={cn(
          "relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 outline-none",
          "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60",
          selected ? "border-primary" : "border-muted-foreground/50 hover:border-muted-foreground",
        )}
      >
        {selected ? <motion.span layoutId={ctx.layoutId} className="bg-primary absolute inset-1 rounded-full" transition={reduce ? { duration: 0 } : SPRING_LAYOUT} /> : null}
      </motion.button>
      {label ? <span className={cn("text-foreground text-sm select-none", disabled && "opacity-60")}>{label}</span> : null}
    </label>
  )
}
