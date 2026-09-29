/** Helpers for the agent's notes documents: sections for the reader's index, and a plain snippet for the canvas card. */

export interface NoteSection {
  id: string
  title: string
  level: number
  body: string
}

const slug = (s: string, i: number) => `sec-${i}-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`

/** Markdown headings split the note; without them, bold-only lines or "Label:" lines do. */
export function parseSections(text: string): NoteSection[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const heading = (l: string): { title: string; level: number } | null => {
    const h = l.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/)
    return h ? { title: h[2].replace(/\*\*/g, ""), level: h[1].length } : null
  }
  const hasHeadings = lines.some((l) => heading(l))
  const fallback = (l: string): { title: string; level: number } | null => {
    const bold = l.match(/^\s*\*\*([^*]{2,80})\*\*:?\s*$/)
    if (bold) return { title: bold[1].replace(/:$/, ""), level: 2 }
    const label = l.match(/^([A-Z][^.!?:\n]{1,50}):\s*$/)
    return label ? { title: label[1], level: 2 } : null
  }
  const find = hasHeadings ? heading : fallback
  const out: NoteSection[] = []
  let cur: { title: string; level: number; body: string[] } | null = null
  const push = () => {
    if (!cur) return
    const body = cur.body.join("\n").trim()
    if (body || out.length || cur.title !== "Overview") out.push({ id: slug(cur.title, out.length), title: cur.title, level: cur.level, body })
  }
  for (const l of lines) {
    const h = find(l)
    if (h) {
      push()
      cur = { ...h, body: [] }
    } else {
      cur ??= { title: "Overview", level: 2, body: [] }
      cur.body.push(l)
    }
  }
  push()
  const sections = out.filter((s) => s.body || out.length === 1)
  if (!sections.length) return [{ id: slug("Notes", 0), title: "Notes", level: 2, body: text.trim() }]
  // A single top-level heading used as the document title shouldn't be its own index entry.
  if (sections.length > 1 && sections[0].level === 1 && !sections[0].body) sections.shift()
  return sections
}

/** Plain text for the canvas card: Markdown and headings stripped. */
export function noteSnippet(text: string, max = 160): string {
  const plain = text
    .replace(/^#{1,4}\s+.*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>|]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
  return plain.length > max ? `${plain.slice(0, max).replace(/\s+\S*$/, "")}…` : plain
}

/** Turn the rich editor's HTML back into the Markdown notes are stored as. */
export function htmlToMarkdown(root: HTMLElement): string {
  const inline = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? "").replace(/\s+/g, " ")
    if (!(n instanceof HTMLElement)) return ""
    const inner = [...n.childNodes].map(inline).join("")
    const tag = n.tagName
    if (tag === "BR") return "\n"
    if ((tag === "STRONG" || tag === "B") && inner.trim()) return `**${inner.trim()}**`
    if ((tag === "EM" || tag === "I") && inner.trim()) return `*${inner.trim()}*`
    if (tag === "CODE") return `\`${inner}\``
    if (tag === "A") return `[${inner}](${n.getAttribute("href") ?? ""})`
    if (tag === "IMG") return `![${n.getAttribute("alt") ?? ""}](${n.getAttribute("src") ?? ""})`
    return inner
  }
  const out: string[] = []
  const list = (el: HTMLElement, ordered: boolean, depth: number) => {
    let i = 1
    for (const li of el.children) {
      if (li.tagName !== "LI") continue
      const nested = [...li.children].filter((c) => c.tagName === "UL" || c.tagName === "OL") as HTMLElement[]
      const text = [...li.childNodes].filter((c) => !nested.includes(c as HTMLElement)).map(inline).join("").trim()
      out.push(`${"  ".repeat(depth)}${ordered ? `${i++}.` : "-"} ${text}`)
      for (const n of nested) list(n, n.tagName === "OL", depth + 1)
    }
  }
  const block = (el: Node) => {
    if (el.nodeType === Node.TEXT_NODE) {
      const t = (el.textContent ?? "").trim()
      if (t) out.push(t, "")
      return
    }
    if (!(el instanceof HTMLElement)) return
    const tag = el.tagName
    const text = () => inline(el).trim()
    if (/^H[1-6]$/.test(tag)) out.push(`${"#".repeat(Math.max(2, Math.min(4, Number(tag[1]))))} ${text().replace(/\*\*/g, "")}`, "")
    else if (tag === "UL" || tag === "OL") {
      list(el, tag === "OL", 0)
      out.push("")
    } else if (tag === "PRE") out.push("```", el.textContent ?? "", "```", "")
    else if (tag === "TABLE") {
      const rows = [...el.querySelectorAll("tr")].map((r) => [...r.children].map((c) => inline(c).trim().replace(/\|/g, "\\|")))
      if (rows.length) {
        out.push(`| ${rows[0].join(" | ")} |`, `| ${rows[0].map(() => "---").join(" | ")} |`, ...rows.slice(1).map((r) => `| ${r.join(" | ")} |`), "")
      }
    } else if ([...el.children].some((c) => /^(P|H[1-6]|UL|OL|DIV|TABLE|PRE)$/.test(c.tagName))) {
      // Browsers nest blocks while editing (a list inside a <p>, lines inside a <div>): walk into them.
      el.childNodes.forEach(block)
    } else {
      // Paragraphs, and the plain <div> lines browsers create on Enter.
      const t = text()
      if (t) out.push(t, "")
    }
  }
  root.childNodes.forEach(block)
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}
