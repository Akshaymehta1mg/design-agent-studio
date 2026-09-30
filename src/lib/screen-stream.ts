/**
 * Pulls prototype screens out of a streamed reply. The model writes each screen as raw HTML in
 * <screen id="…" title="…">…</screen> blocks instead of JSON tool arguments: no escaping, and a cut-off
 * reply loses only the screen being written. Text outside the blocks passes through to the chat.
 */

export interface StreamedScreen {
  id?: string
  title: string
  html: string
}

/** <screen> blocks carry one screen's HTML; one <prototype-script> block carries the prototype's shared behaviour. */
const OPEN = /<(screen|prototype-script)[\s>]/i
const CLOSE = { screen: /<\/screen\s*>/i, "prototype-script": /<\/prototype-script\s*>/i }
const TRAILING_FENCE = /```[a-zA-Z]*\s*$/
type Kind = keyof typeof CLOSE

/** Where a trailing, possibly unfinished tag (and a code fence just before it) starts, so it isn't emitted too early. */
function holdFrom(s: string, tags: string[]) {
  let at = s.length
  const lt = s.lastIndexOf("<")
  if (lt >= 0 && tags.some((tag) => s.length - lt <= tag.length && tag.startsWith(s.slice(lt).toLowerCase()))) at = lt
  const fence = s.slice(0, at).match(/`{1,3}[a-zA-Z]*\s*$/)
  if (fence?.index !== undefined) at = fence.index
  return at
}

function attrs(tag: string) {
  const out: Record<string, string> = {}
  for (const m of tag.matchAll(/([a-zA-Z_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? ""
  return out
}

export class ScreenStream {
  private buf = ""
  private open: { id?: string; title: string; kind: Kind } | null = null
  private html = ""
  private afterClose = false

  /** Feed a text delta; returns chat text to show, finished screens, and titles of screens just started. */
  push(delta: string): { text: string; screens: StreamedScreen[]; started: string[]; scripts: string[] } {
    this.buf += delta
    let text = ""
    const screens: StreamedScreen[] = []
    const started: string[] = []
    const scripts: string[] = []
    for (;;) {
      if (this.open) {
        const end = CLOSE[this.open.kind]
        const close = this.buf.search(end)
        if (close < 0) {
          const keep = holdFrom(this.buf, [`</${this.open.kind}>`])
          this.html += this.buf.slice(0, keep)
          this.buf = this.buf.slice(keep)
          break
        }
        this.html += this.buf.slice(0, close)
        this.buf = this.buf.slice(close).replace(end, "")
        if (this.open.kind === "prototype-script") scripts.push(this.html.trim())
        else screens.push({ id: this.open.id, title: this.open.title, html: this.html.trim() })
        this.open = null
        this.html = ""
        this.afterClose = true
        continue
      }
      if (this.afterClose) {
        // Drop a code fence the model may have wrapped around the block (wait until it can tell).
        if (/^\s*`{0,3}[ \t]*$/.test(this.buf)) break
        this.buf = this.buf.replace(/^\s*```[ \t]*\n?/, "")
        this.afterClose = false
      }
      const at = this.buf.search(OPEN)
      if (at < 0) {
        const keep = holdFrom(this.buf, ["<screen ", "<prototype-script "])
        text += this.buf.slice(0, keep)
        this.buf = this.buf.slice(keep)
        break
      }
      const end = this.buf.indexOf(">", at)
      if (end < 0) {
        text += this.buf.slice(0, at).replace(TRAILING_FENCE, "")
        this.buf = this.buf.slice(at)
        break
      }
      text += this.buf.slice(0, at).replace(TRAILING_FENCE, "")
      const tag = this.buf.slice(at, end + 1)
      const kind = (tag.match(OPEN)?.[1].toLowerCase() ?? "screen") as Kind
      const a = attrs(tag)
      const title = kind === "prototype-script" ? "Interactions" : (a.title || a.id || "Screen").slice(0, 60)
      this.open = { id: a.id || undefined, title, kind }
      started.push(title)
      this.buf = this.buf.slice(end + 1)
    }
    return { text, screens, started, scripts }
  }

  /** End of a step: flush the remaining text and report a screen that was cut off. */
  end(): { text: string; partial?: { id?: string; title: string; chars: number } } {
    let partial: { id?: string; title: string; chars: number } | undefined
    let text = ""
    if (this.open) partial = { id: this.open.id, title: this.open.title, chars: (this.html + this.buf).length }
    else if (OPEN.test(this.buf)) partial = { title: "Screen", chars: 0 }
    else text = this.afterClose ? this.buf.replace(/^\s*```[ \t]*\n?/, "") : this.buf
    this.buf = ""
    this.open = null
    this.html = ""
    this.afterClose = false
    return { text, partial }
  }
}
