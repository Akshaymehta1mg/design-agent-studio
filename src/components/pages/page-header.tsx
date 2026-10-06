import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function PageHeader({ title, description, action, bordered = true }: { title: string; description?: ReactNode; action?: ReactNode; bordered?: boolean }) {
  return (
    <header className={cn("mb-2 flex flex-wrap items-end justify-between gap-4 pt-10 pb-6", bordered && "border-b")}>
      <div className="max-w-2xl">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
        {description && <p className="text-muted-foreground mt-2 text-[14.5px] leading-relaxed text-pretty">{description}</p>}
      </div>
      {action}
    </header>
  )
}

export function Section({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-[15.5px] font-semibold tracking-normal">{title}</h2>
          {description && <p className="text-muted-foreground mt-0.5 text-[13px]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
