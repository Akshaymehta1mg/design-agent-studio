import { useMemo } from "react"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

function inline(s: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="underline underline-offset-2">$1</a>')
}

/** Small, safe markdown: paragraphs, lists, headings, code. Everything is escaped first. */
export function toHtml(md: string) {
  const out: string[] = []
  const blocks = md.replace(/\r/g, "").split(/```/)
  blocks.forEach((block, i) => {
    if (i % 2 === 1) {
      out.push(`<pre><code>${esc(block.replace(/^\w*\n/, ""))}</code></pre>`)
      return
    }
    const lines = block.split("\n")
    let list: "ul" | "ol" | null = null
    let para: string[] = []
    const flush = () => {
      if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`)
      para = []
    }
    const closeList = () => {
      if (list) out.push(`</${list}>`)
      list = null
    }
    for (const line of lines) {
      const ul = /^\s*[-*•]\s+(.*)/.exec(line)
      const ol = /^\s*(\d+)[.)]\s+(.*)/.exec(line)
      const h = /^(#{1,4})\s+(.*)/.exec(line)
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        flush()
        closeList()
        out.push("<hr>")
      } else if (ul || ol) {
        flush()
        const want = ul ? "ul" : "ol"
        if (list !== want) {
          closeList()
          // Keep the source numbering: a list broken up by bullets continues at 2, 3… instead of restarting at 1.
          const start = ol ? Number(ol[1]) : 1
          out.push(want === "ol" && start !== 1 ? `<ol start="${start}">` : `<${want}>`)
          list = want
        }
        out.push(`<li>${inline(ul ? ul[1] : ol![2])}</li>`)
      } else if (h) {
        flush()
        closeList()
        out.push(`<h4>${inline(h[2])}</h4>`)
      } else if (!line.trim()) {
        flush()
        closeList()
      } else {
        closeList()
        para.push(line.trim())
      }
    }
    flush()
    closeList()
  })
  return out.join("")
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => toHtml(text), [text])
  return <div className={`md ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />
}
