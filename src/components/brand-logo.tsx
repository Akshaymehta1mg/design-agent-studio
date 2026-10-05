import { siAsana, siGithub, siJira, siLinear, siNotion } from "simple-icons"
import { FigmaLogo } from "@/components/type-icon"
import { cn } from "@/lib/utils"

/** Brand marks for the connectors we know. Paths and colors come from Simple Icons (CC0); Figma's is its full-color mark. */
const SIMPLE = { linear: siLinear, notion: siNotion, github: siGithub, jira: siJira, asana: siAsana } as const
type Brand = keyof typeof SIMPLE | "figma" | "mobbin"

const HOSTS: [RegExp, Brand][] = [
  [/figma/i, "figma"],
  [/linear/i, "linear"],
  [/notion/i, "notion"],
  [/github/i, "github"],
  [/atlassian|jira/i, "jira"],
  [/asana/i, "asana"],
  [/mobbin/i, "mobbin"],
]

export function brandOf(c: { catalogId?: string; url?: string; name?: string }): Brand | null {
  const key = `${c.catalogId ?? ""} ${c.url ?? ""} ${c.name ?? ""}`
  return HOSTS.find(([re]) => re.test(key))?.[1] ?? null
}

export function BrandLogo({ of, size = 40, className }: { of: { catalogId?: string; url?: string; name?: string }; size?: number; className?: string }) {
  const brand = brandOf(of)
  const inner = Math.round(size * 0.5)
  const box = cn("grid shrink-0 place-items-center border shadow-xs", className)
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.28) }

  if (brand === "figma")
    return (
      <span className={cn(box, "bg-white")} style={style}>
        <FigmaLogo size={inner} />
      </span>
    )
  if (brand === "mobbin")
    return (
      <span className={cn(box, "border-transparent bg-black font-black tracking-tighter text-white")} style={{ ...style, fontSize: size * 0.42 }}>
        M
      </span>
    )
  if (brand) {
    const icon = SIMPLE[brand]
    return (
      <span className={cn(box, "bg-white")} style={style} title={icon.title}>
        <svg viewBox="0 0 24 24" width={inner} height={inner} fill={`#${icon.hex}`} aria-hidden>
          <path d={icon.path} />
        </svg>
      </span>
    )
  }
  return (
    <span className={cn(box, "bg-muted text-foreground font-bold")} style={{ ...style, fontSize: size * 0.36 }}>
      {(of.name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  )
}
