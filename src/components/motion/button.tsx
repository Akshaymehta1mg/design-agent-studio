// Press-feedback button in the spirit of beUI's motion button, styled with shadcn's buttonVariants.
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react"
import type { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"
import { SPRING_PRESS } from "@/lib/ease"
import { cn } from "@/lib/utils"

export function PressButton({
  className,
  variant,
  size,
  pressScale = 0.93,
  ...props
}: HTMLMotionProps<"button"> & VariantProps<typeof buttonVariants> & { pressScale?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      whileTap={reduce || props.disabled ? undefined : { scale: pressScale }}
      transition={SPRING_PRESS}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
