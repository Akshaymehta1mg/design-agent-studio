/**
 * Extracts the Tata 1mg Dopamine design system from its portable HTML reference into
 * src/prism/design-system/reference.json, so the studio can show it natively and the agent can read it.
 *
 *   node scripts/extract-design-system.cjs [--cdn <dir with the page's CDN libraries>]
 *
 * Colours come from the page's COLORS / SEMANTIC / BRAND_COLORS constants. Every other tab is rendered in
 * headless Chromium (Playwright) and read in DOM order: header, facts, notes, sections, demos (with computed
 * styles), type rows, tables, and the page's own CSS for the classes the tab uses.
 */
const fs = require("fs")
const path = require("path")
const http = require("http")
const vm = require("vm")

const ROOT = path.resolve(__dirname, "..")
const HTML = path.join(ROOT, "public/prism/design-system/design-system.html")
const OUT = path.join(ROOT, "src/prism/design-system/reference.json")
const cdnArg = process.argv.indexOf("--cdn")
const CDN_DIR = cdnArg > 0 ? process.argv[cdnArg + 1] : null
const CDN_FILES = {
  "react.production.min.js": "react-18.2.0/package/umd/react.production.min.js",
  "react-dom.production.min.js": "react-dom-18.2.0/package/umd/react-dom.production.min.js",
  "dayjs.min.js": "dayjs-1.11.10/package/dayjs.min.js",
  "antd.min.js": "antd-5.22.6/package/dist/antd.min.js",
  "babel.min.js": "babel-standalone-7.23.9/package/babel.min.js",
}

function constant(src, name) {
  const start = src.indexOf(`const ${name}=`)
  if (start < 0) throw new Error(`No const ${name}`)
  let i = src.indexOf("=", start) + 1
  const open = src[i]
  const close = open === "{" ? "}" : "]"
  let depth = 0, str = null
  for (let j = i; j < src.length; j++) {
    const ch = src[j]
    if (str) { if (ch === "\\") j++; else if (ch === str) str = null; continue }
    if (ch === "'" || ch === '"' || ch === "`") str = ch
    else if (ch === open) depth++
    else if (ch === close && --depth === 0) return vm.runInNewContext(`(${src.slice(i, j + 1)})`)
  }
  throw new Error(`Unterminated const ${name}`)
}

async function main() {
  const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
  const src = fs.readFileSync(HTML, "utf8")
  const COLORS = constant(src, "COLORS"), SEMANTIC = constant(src, "SEMANTIC"), BRAND = constant(src, "BRAND_COLORS")
  const FP = constant(src, "FP"), CP = constant(src, "CP")

  const server = http.createServer((req, res) => {
    const file = path.join(path.dirname(HTML), decodeURIComponent(req.url.split("?")[0]))
    fs.readFile(file, (err, data) => (err ? (res.writeHead(404), res.end()) : res.end(data)))
  }).listen(0)
  const port = server.address().port
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  if (CDN_DIR) {
    await page.route("https://cdnjs.cloudflare.com/**", (r) => {
      const f = CDN_FILES[r.request().url().split("/").pop()]
      return f ? r.fulfill({ path: path.join(CDN_DIR, f), contentType: "application/javascript" }) : r.abort()
    })
  }
  await page.goto(`http://localhost:${port}/design-system.html`)
  await page.waitForSelector(".ant-menu", { timeout: 60000 })

  const tabs = []
  const groups = [["foundation", FP], ["component", CP]]
  for (const [group, defs] of groups) {
    for (const [key, title] of Object.entries(defs)) {
      const exact = new RegExp(`^\\s*${title.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}\\s*$`)
      await page.locator(".ant-menu-item").filter({ hasText: exact }).first().click()
      await page.waitForTimeout(350)
      const tab = await page.evaluate(extractTab)
      const kind = /-page$|labs-home/.test(key) ? "page" : group
      tabs.push({ key, group: kind, title, ...tab })
      process.stdout.write(`${key} `)
    }
  }
  await browser.close()
  server.close()

  // The page's UN (usage note) component reads a `ch` prop but callers pass children, so note bodies
  // never render. Recover them from the source and fill any note that came out empty.
  const noteText = {}
  for (const m of src.matchAll(/<UN label="([^"]+)"\s*>([\s\S]*?)<\/UN>/g)) {
    const body = m[2].replace(/<[^>]+>/g, " ").replace(/\{['"`]([^'"`]*)['"`]\}/g, "$1").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim()
    if (body) noteText[m[1]] = body
  }
  for (const t of tabs) for (const n of t.notes) if (!n.text && noteText[n.label]) n.text = noteText[n.label]

  const colors = {
    palettes: Object.entries(COLORS).map(([id, p]) => ({ id, name: p.name, stops: Object.entries(p.stops).map(([stop, hex]) => ({ stop, hex: hex.toUpperCase() })) })),
    semantic: SEMANTIC.map((s) => ({ token: s.token, role: s.role, maps: s.maps, hex: (s.maps.match(/#[0-9a-f]{3,8}/i) || [""])[0].toUpperCase() })),
    brand: BRAND.map((b) => ({ ...b, hex: b.hex.toUpperCase() })),
  }
  fs.writeFileSync(OUT, JSON.stringify({ source: "public/prism/design-system/design-system.html", colors, tabs }, null, 1))
  console.log(`\nWrote ${path.relative(ROOT, OUT)}: ${colors.palettes.length} palettes, ${colors.semantic.length} semantic tokens, ${tabs.length} tabs`)
}

/** Runs in the page: read the visible tab (.ca) in DOM order. */
function extractTab() {
  const ca = document.querySelector(".ca")
  // textContent, not innerText: CSS text-transform (e.g. uppercase labels) shouldn't leak into the data.
  const text = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim()
  const out = { label: "", description: "", facts: [], notes: [], sections: [], css: "" }
  let section = null
  const sec = (title) => ((section = { title, description: "", blocks: [] }), out.sections.push(section), section)
  const cur = () => section || sec("")

  const STYLE_KEYS = ["width", "height", "padding", "border-radius", "background-color", "background-image", "color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-transform", "border", "box-shadow", "gap", "opacity"]
  const DEFAULTS = { "background-color": "rgba(0, 0, 0, 0)", "background-image": "none", "box-shadow": "none", border: /^0px none/, padding: "0px", "border-radius": "0px", "letter-spacing": "normal", "text-transform": "none", gap: "normal", opacity: "1" }
  const hex = (v) => v.replace(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/g, (m, r, g, b, a) => (a !== undefined && a !== "1" ? m : "#" + [r, g, b].map((n) => (+n).toString(16).padStart(2, "0")).join("").toUpperCase()))
  const styleOf = (el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), o = {}
    for (const k of STYLE_KEYS) {
      let v = k === "width" ? `${Math.round(r.width)}px` : k === "height" ? `${Math.round(r.height)}px` : cs.getPropertyValue(k)
      const d = DEFAULTS[k]
      if (!v || (d instanceof RegExp ? d.test(v) : v === d)) continue
      if (k === "font-family") v = v.split(",")[0].replace(/"/g, "")
      o[k] = hex(v).replace(/url\("data:[^)]*"\)/g, "url(data:…)").slice(0, 200)
    }
    return o
  }
  // Demo specimens: the direct children of a preview box, one level deeper for plain wrappers.
  const specimens = (box) => {
    let kids = [...box.children]
    if (kids.length === 1 && kids[0].children.length > 1) kids = [...kids[0].children]
    const seen = new Set(), list = []
    for (const el of kids.slice(0, 40)) {
      if (el.getBoundingClientRect().width === 0) continue
      // Plain wrappers (no fill, border, radius or shadow) stand in for the first styled element inside them.
      const visible = (s) => s["background-color"] || s["background-image"] || s.border || s["border-radius"] || s["box-shadow"]
      let target = el, s = styleOf(el)
      if (!visible(s)) {
        const inner = [...el.querySelectorAll("*")].find((d) => d.getBoundingClientRect().width > 0 && visible(styleOf(d)))
        if (inner) { target = inner; s = styleOf(inner) }
      }
      const label = text(el).slice(0, 90)
      const sig = JSON.stringify(s) + el.tagName
      if (seen.has(sig) && !label) continue
      seen.add(sig)
      list.push({ tag: target.tagName.toLowerCase(), class: (typeof target.className === "string" ? target.className : "").trim().slice(0, 80), text: label, style: s })
      if (list.length >= 16) break
    }
    return list
  }
  // Foundation token layouts: spacing bars, radius tiles, shadow cards, gradient swatches.
  const tokenBlock = (el) => {
    const pick = (sel, fn) => [...el.querySelectorAll(sel)].map(fn).filter((x) => x.name)
    if (el.matches(".sr")) return { name: text(el.querySelector(".lbl")), value: text(el.querySelector(".px")) }
    let items = pick(".ri", (i) => ({ name: text(i.querySelector("span")), value: getComputedStyle(i.querySelector(".rb")).borderRadius }))
    if (items.length) return { kind: "radius", items }
    items = pick(".shi", (i) => ({ name: text(i.querySelector("span")), value: getComputedStyle(i.querySelector(".shb")).boxShadow }))
    if (items.length) return { kind: "shadow", items }
    items = pick(".gi", (i) => ({ name: text(i.querySelector("span")), value: getComputedStyle(i.querySelector(".gs")).backgroundImage }))
    if (items.length) return { kind: "gradient", items }
    return null
  }
  // Page references render in Shadow DOM: outline their visible blocks in order.
  const outline = (host) => {
    const rootNode = host.shadowRoot || host
    const lines = []
    const walk = (node, depth) => {
      for (const c of node.children) {
        if (lines.length >= 90) return
        const r = c.getBoundingClientRect()
        if (r.width < 4 || r.height < 4 || /^(STYLE|SCRIPT|svg|path)$/i.test(c.tagName)) continue
        const own = [...c.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim()
        const cls = (typeof c.className === "string" ? c.className : "").split(/\s+/).filter(Boolean).slice(0, 2).join(".")
        const cs = getComputedStyle(c)
        const bits = [cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? `bg ${hex(cs.backgroundColor)}` : "", cs.borderRadius !== "0px" ? `r ${cs.borderRadius}` : "", own ? `${cs.fontSize}/${cs.fontWeight} ${hex(cs.color)}` : ""].filter(Boolean).join(", ")
        if (depth <= 3 || own) lines.push(`${"  ".repeat(Math.min(depth, 6))}- ${c.tagName.toLowerCase()}${cls ? "." + cls : ""} ${Math.round(r.width)}×${Math.round(r.height)}${bits ? ` (${bits})` : ""}${own ? `: ${own.slice(0, 80)}` : ""}`)
        walk(c.shadowRoot || c, depth + 1)
      }
    }
    walk(rootNode, 0)
    return lines.join("\n")
  }
  const tableRows = (t) => [...t.querySelectorAll("tr")].map((tr) => [...tr.children].map(text)).filter((r) => r.some(Boolean))

  for (const el of ca.children) {
    const cls = typeof el.className === "string" ? el.className : ""
    if (cls.includes("ph")) {
      out.label = text(el.querySelector(".lbl"))
      out.description = text(el.querySelector("p"))
      continue
    }
    if (cls.split(" ").includes("ir")) {
      for (const c of el.querySelectorAll(".ic")) out.facts.push({ label: text(c.querySelector(".il")), value: text(c.querySelector(".iv")) })
      continue
    }
    if (cls.split(" ").includes("un")) {
      const label = text(el.querySelector(".nl"))
      out.notes.push({ label, text: text(el).replace(label, "").trim() })
      continue
    }
    if (el.tagName === "H2" || cls.split(" ").includes("st")) { sec(text(el)); continue }
    if (el.tagName === "P" && cls.includes("sd")) {
      const s = cur(); s.description = s.description ? `${s.description} ${text(el)}` : text(el)
      continue
    }
    const tok = tokenBlock(el)
    if (tok) {
      if (tok.kind) cur().blocks.push({ type: "tokens", kind: tok.kind, items: tok.items })
      else {
        const s = cur(), last = s.blocks[s.blocks.length - 1]
        if (last?.type === "tokens" && last.kind === "spacing") last.items.push(tok)
        else s.blocks.push({ type: "tokens", kind: "spacing", items: [tok] })
      }
      continue
    }
    const host = el.shadowRoot ? el : el.querySelector("*:not(svg *)") && [...el.querySelectorAll("*")].find((x) => x.shadowRoot)
    if (host || /native-shell|reference/.test(cls)) {
      cur().blocks.push({ type: "outline", text: outline(host || el) })
      continue
    }
    const tables = el.matches("table") ? [el] : [...el.querySelectorAll("table")]
    if (tables.length) { for (const t of tables) cur().blocks.push({ type: "table", rows: tableRows(t).slice(0, 80) }); continue }
    const typeRows = el.querySelectorAll(".tr")
    if (typeRows.length) {
      cur().blocks.push({ type: "table", rows: [["Style", "Size / weight / line height"], ...[...typeRows].map((r) => [text(r.querySelector(".tn")), text(r.querySelector(".tm"))])] })
      continue
    }
    if (cls.split(" ").includes("pb") || el.querySelector(".pb")) {
      const boxes = cls.split(" ").includes("pb") ? [el] : [...el.querySelectorAll(".pb")]
      for (const b of boxes) cur().blocks.push({ type: "demo", specimens: specimens(b) })
      continue
    }
    const t = text(el)
    if (t) cur().blocks.push({ type: "text", text: t.slice(0, 1500) })
  }

  // The page's own CSS rules for classes used in this tab (antd's generated rules are skipped).
  const used = new Set([...ca.querySelectorAll("[class]")].flatMap((e) => (typeof e.className === "string" ? e.className.split(/\s+/) : [])).filter((c) => c && !c.startsWith("ant-") && !c.startsWith("css-")))
  const rules = []
  for (const sheet of document.styleSheets) {
    let list
    try { list = sheet.cssRules } catch { continue }
    for (const rule of list) {
      const sel = rule.selectorText
      if (!sel || /ant-|:where/.test(sel)) continue
      const classes = sel.match(/\.[A-Za-z_][\w-]*/g) || []
      if (classes.some((c) => used.has(c.slice(1)))) rules.push(rule.cssText.replace(/url\("data:[^)]*"\)/g, "url(data:…)"))
    }
  }
  out.css = rules.join("\n").slice(0, 12000)
  return out
}

main().catch((e) => { console.error(e); process.exit(1) })
