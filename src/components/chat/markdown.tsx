import { useMemo } from "react"

// Escapes quotes too, so nothing in the text can break out of an attribute.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

const URL_RE = String.raw`((?:https?:\/\/|\/)[^)\s]+)`

function inline(s: string) {
  // Pull links, images and code out first so emphasis rules never touch URLs.
  const kept: string[] = []
  const keep = (html: string) => `\u0000${kept.push(html) - 1}\u0000`
  const out = esc(s)
    .replace(/`([^`]+)`/g, (_, code) => keep(`<code>${code}</code>`))
    .replace(new RegExp(String.raw`!\[([^\]]*)\]\(${URL_RE}\)`, "g"), (_, alt, url) => keep(`<img src="${url}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" class="md-img">`))
    .replace(new RegExp(String.raw`\[([^\]]+)\]\(${URL_RE}\)`, "g"), (_, text, url) => keep(`<a href="${url}" target="_blank" rel="noreferrer" class="underline underline-offset-2">${text}</a>`))
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, "$1<em>$2</em>")
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)])
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
const isTableRule = (line?: string) => !!line && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line)

/** Small, safe markdown: paragraphs, lists, headings, tables, images, code. Everything is escaped first. */
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
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]
      if (line.includes("|") && isTableRule(lines[li + 1])) {
        flush()
        closeList()
        const head = cells(line)
        const body: string[][] = []
        li += 2
        while (li < lines.length && lines[li].includes("|") && lines[li].trim()) body.push(cells(lines[li++]))
        li--
        out.push(`<div class="md-table"><table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`)
        continue
      }
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
