// From beUI: beui.dev (motion/action-swap), trimmed to the roll text and icon swaps used here.
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react"
import type { ReactNode } from "react"
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease"
import { cn } from "@/lib/utils"

const ROLL_EXIT = { duration: 0.14, ease: EASE_OUT } as const
const ROLL_BLUR = "blur(3px)"

const TEXT_ROLL: Variants = {
  initial: { opacity: 0, y: "90%", filter: ROLL_BLUR },
  animate: { opacity: 1, y: "0%", filter: "blur(0px)", transition: SPRING_SWAP },
  exit: { opacity: 0, y: "-90%", filter: ROLL_BLUR, transition: ROLL_EXIT },
}

const ICON_ROLL: Variants = {
  initial: { opacity: 0, y: 12, filter: ROLL_BLUR },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: SPRING_SWAP },
  exit: { opacity: 0, y: -12, filter: ROLL_BLUR, transition: ROLL_EXIT },
}

/** Rolls text vertically whenever `value` changes. */
export function ActionSwapRollText({ value, children, className, wrap }: { value: string; children: ReactNode; className?: string; wrap?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <span
      className={cn("relative -my-[0.08em] inline-block max-w-full py-[0.08em] align-bottom", wrap ? "whitespace-normal" : "whitespace-nowrap", className)}
      style={{ clipPath: "inset(0 -999px)", WebkitClipPath: "inset(0 -999px)" }}
    >
      <span aria-hidden className={cn("invisible inline-block", wrap ? "whitespace-normal" : "whitespace-nowrap")}>
        {children}
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={`roll-${value}`}
          variants={TEXT_ROLL}
          initial={reduce ? false : "initial"}
          animate={reduce ? { opacity: 1, filter: "blur(0px)", y: 0 } : "animate"}
          exit={reduce ? undefined : "exit"}
          className={cn("absolute top-[0.08em] left-0 inline-block max-w-full will-change-[opacity,filter,transform]", wrap ? "w-full whitespace-normal" : "truncate")}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function ActionSwapRollIcon({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`roll-${value}`}
          aria-hidden
          variants={ICON_ROLL}
          initial={reduce ? false : "initial"}
          animate={reduce ? { opacity: 1, filter: "blur(0px)", y: 0 } : "animate"}
          exit={reduce ? undefined : "exit"}
          className="col-start-1 row-start-1 inline-flex items-center justify-center"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
