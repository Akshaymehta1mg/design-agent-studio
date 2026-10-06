import type { Device, PrototypeScreen } from "./types"

export const DEVICE_SIZES: Record<Device, { w: number; h: number }> = {
  // iPhone 17 (points)
  mobile: { w: 402, h: 874 },
  tablet: { w: 820, h: 1080 },
  desktop: { w: 1280, h: 820 },
}

/**
 * Wireframe format: an HTML fragment (no <script>) rendered in a sandboxed
 * iframe via srcdoc. The agent may use inline styles and the `wf-*` helpers
 * below. HTML is what models write most reliably, it renders instantly with no
 * build step, and the sandbox (no scripts) makes it safe to show untrusted output.
 */
export const WF_BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
body{font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;-webkit-font-smoothing:antialiased}
:root{--wf-ink:#1d1d1f;--wf-2:#5f5f64;--wf-3:#9a9aa0;--wf-line:#e4e4e7;--wf-fill:#f2f2f4;--wf-fill-2:#e9e9ec;--wf-accent:#1d1d1f;--wf-radius:12px}
.wf-screen{min-height:100vh;display:flex;flex-direction:column}
.wf-status{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;font-size:13px;font-weight:600}
.wf-bar{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--wf-line)}
.wf-bar .wf-title{flex:1;text-align:center;font-weight:600}
.wf-body{flex:1;padding:16px;display:flex;flex-direction:column;gap:16px}
.wf-footer{padding:12px 16px 28px;border-top:1px solid var(--wf-line);display:flex;flex-direction:column;gap:8px;background:#fff}
.wf-row{display:flex;align-items:center;gap:10px}
.wf-col{display:flex;flex-direction:column;gap:8px}
.wf-grid{display:grid;gap:10px}
.wf-between{display:flex;align-items:center;justify-content:space-between;gap:10px}
.wf-h1{font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-.01em}
.wf-h2{font-size:18px;font-weight:650}
.wf-h3{font-size:15px;font-weight:600}
.wf-text{color:var(--wf-2)}
.wf-muted{color:var(--wf-3);font-size:12px}
.wf-label{font-size:12px;font-weight:600;color:var(--wf-2);text-transform:uppercase;letter-spacing:.04em}
.wf-card{border:1px solid var(--wf-line);border-radius:var(--wf-radius);padding:14px;background:#fff}
.wf-fill{background:var(--wf-fill);border-radius:var(--wf-radius);padding:14px}
.wf-divider{height:1px;background:var(--wf-line)}
.wf-img{background:var(--wf-fill-2);border-radius:var(--wf-radius);position:relative;overflow:hidden;min-height:60px}
.wf-img::before,.wf-img::after{content:"";position:absolute;inset:0;background:linear-gradient(to top right,transparent calc(50% - .5px),#d4d4d8 50%,transparent calc(50% + .5px))}
.wf-img::after{transform:scaleX(-1)}
.wf-avatar{width:36px;height:36px;border-radius:50%;background:var(--wf-fill-2);flex:none}
.wf-icon{width:20px;height:20px;border-radius:6px;background:var(--wf-fill-2);flex:none}
.wf-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--wf-line);background:#fff;font-weight:600;font-size:15px;color:var(--wf-ink)}
.wf-btn-primary{background:var(--wf-accent);border-color:var(--wf-accent);color:#fff}
.wf-btn-block{display:flex;width:100%}
.wf-btn-sm{height:32px;padding:0 12px;font-size:13px}
.wf-input{height:46px;border:1px solid var(--wf-line);border-radius:10px;padding:0 14px;display:flex;align-items:center;color:var(--wf-3);background:#fff}
.wf-chip{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--wf-line);font-size:13px;font-weight:500;white-space:nowrap;background:#fff}
.wf-chip-on{background:var(--wf-ink);border-color:var(--wf-ink);color:#fff}
.wf-tag{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:6px;background:var(--wf-fill);font-size:12px;font-weight:600;color:var(--wf-2)}
.wf-list{display:flex;flex-direction:column}
.wf-list>*{padding:12px 0;border-bottom:1px solid var(--wf-line)}
.wf-list>*:last-child{border-bottom:0}
.wf-scroll-x{display:flex;gap:8px;overflow:hidden}
.wf-tabbar{display:flex;justify-content:space-around;padding:10px 0 26px;border-top:1px solid var(--wf-line)}
.wf-tabbar>*{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:var(--wf-3)}
.wf-sheet{border-radius:18px 18px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.08);background:#fff}
.wf-handle{width:36px;height:5px;border-radius:3px;background:var(--wf-fill-2);margin:8px auto}
.wf-note{border:1.5px dashed #c4c4c8;border-radius:10px;padding:10px 12px;font-size:12px;color:var(--wf-2)}
`

export function buildSrcDoc(html: string, extraCss = ""): string {
  const clean = sanitizeWireframe(html)
  // @import must come before any other rule.
  const imports = (extraCss.match(/@import[^;]+;/g) ?? []).join("")
  const rest = extraCss.replace(/@import[^;]+;/g, "")
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${imports}${WF_BASE_CSS}${rest}</style></head><body>${clean}</body></html>`
}

/** Strip anything executable or remote. The iframe is sandboxed as well; this is belt and braces. */
export function sanitizeWireframe(html: string): string {
  return html
    .replace(/```(?:html)?/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed|link|meta|base)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
}

// ───────── Neutral specimen for the design-system preview (never sent to the model) ─────────

export const PREVIEW_WIREFRAME = `<div class="wf-screen">
<div class="wf-status"><span>9:41</span><span>●●● ▲ ▮</span></div>
<div class="wf-bar"><div class="wf-icon"></div><div class="wf-title">Title</div><div class="wf-icon"></div></div>
<div class="wf-body">
  <div class="wf-col" style="gap:4px"><div class="wf-h1">Heading</div><div class="wf-text">Supporting text sits under the heading.</div></div>
  <div class="wf-img" style="height:150px"></div>
  <div class="wf-col" style="gap:8px"><div class="wf-label">Options</div>
    <div class="wf-scroll-x"><span class="wf-chip wf-chip-on">Selected</span><span class="wf-chip">Option</span><span class="wf-chip">Option</span></div></div>
  <div class="wf-card wf-col" style="gap:8px"><div class="wf-h3">Card title</div><div class="wf-muted">Card body text</div></div>
  <div class="wf-input">Input field</div>
  <div class="wf-list">
    <div class="wf-between"><span>List item</span><span class="wf-muted">›</span></div>
    <div class="wf-between"><span>List item</span><span class="wf-muted">›</span></div>
  </div>
</div>
<div class="wf-footer"><div class="wf-btn wf-btn-primary wf-btn-block">Primary action</div><div class="wf-btn wf-btn-block">Secondary action</div></div>
</div>`

// ───────── Prototypes: every screen of a flow in one interactive HTML file ─────────


/**
 * Linking conventions the agent writes (plain attributes; the model never writes scripts):
 *   data-go="screen-id"  → go to that screen      data-back     → previous screen
 *   data-open="sheet-id" → show that overlay      data-close    → hide the overlay it's in (or data-close="id")
 *   data-overlay="id"    → an overlay (sheet, dialog, menu), hidden until opened
 */
export const PROTOTYPE_CSS = `
[data-screen]{min-height:100vh}
[data-screen][hidden],[data-overlay][hidden]{display:none!important}
[data-go],[data-back],[data-open],[data-close]{cursor:pointer}
.wf-overlay{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(0,0,0,.42)}
.wf-overlay.wf-center{justify-content:center;align-items:center;padding:24px}
.wf-overlay>.wf-sheet{display:flex;flex-direction:column;gap:12px;padding:8px 16px 24px;max-height:85vh;overflow:auto}
.wf-overlay.wf-center>.wf-sheet,.wf-overlay.wf-center>.wf-card{width:100%;max-width:360px;border-radius:18px;padding:20px}
@keyframes wf-in-fwd{from{opacity:.35;transform:translateX(28px)}to{opacity:1;transform:none}}
@keyframes wf-in-back{from{opacity:.35;transform:translateX(-28px)}to{opacity:1;transform:none}}
[data-screen].wf-in-fwd{animation:wf-in-fwd .26s cubic-bezier(.2,.8,.2,1)}
[data-screen].wf-in-back{animation:wf-in-back .26s cubic-bezier(.2,.8,.2,1)}
@keyframes wf-fade-in{from{opacity:0}}
@keyframes wf-fade-out{to{opacity:0}}
@keyframes wf-sheet-in{from{transform:translateY(100%)}}
@keyframes wf-sheet-out{to{transform:translateY(100%)}}
@keyframes wf-pop-in{from{opacity:0;transform:scale(.94)}}
@keyframes wf-pop-out{to{opacity:0;transform:scale(.96)}}
.wf-overlay:not([hidden]){animation:wf-fade-in .2s ease-out}
.wf-overlay:not([hidden])>.wf-sheet{animation:wf-sheet-in .3s cubic-bezier(.2,.8,.2,1)}
.wf-overlay.wf-center:not([hidden])>*{animation:wf-pop-in .22s cubic-bezier(.2,.8,.2,1)}
.wf-overlay.wf-closing{animation:wf-fade-out .2s ease-in forwards}
.wf-overlay.wf-closing>.wf-sheet{animation:wf-sheet-out .2s ease-in forwards}
.wf-overlay.wf-center.wf-closing>*{animation:wf-pop-out .18s ease-in forwards}
:is([data-go],[data-back],[data-open],[data-close]){transition:transform .12s ease,filter .12s ease}
:is([data-go],[data-back],[data-open],[data-close]):active{transform:scale(.97);filter:brightness(.97)}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
.wf-proto-hint [data-screen]:not([hidden]) :is([data-go],[data-back],[data-open],[data-close]){outline:2px solid rgba(37,99,235,.6);outline-offset:2px;border-radius:6px}
.wf-proto-nav{position:fixed;left:12px;bottom:12px;z-index:99;font:500 12px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.wf-proto-nav summary{list-style:none;cursor:pointer;background:#111;color:#fff;border-radius:999px;padding:7px 12px;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.wf-proto-nav summary::-webkit-details-marker{display:none}
.wf-proto-nav div{margin-bottom:6px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.14);max-height:60vh;overflow:auto}
.wf-proto-nav a{display:block;padding:6px 10px;border-radius:8px;color:#111;text-decoration:none}
.wf-proto-nav a:hover{background:#f2f2f2}
`

/** Runs inside the sandboxed prototype iframe (scripts allowed, no same-origin). */
/** Inside the player's iPhone frame: keep content clear of the Dynamic Island. */
export const PHONE_SAFE_AREA_CSS = `.wf-status{height:54px;padding:0 30px}.wf-screen:not(:has(>.wf-status)){padding-top:54px}.wf-footer{padding-bottom:30px}.wf-overlay>.wf-sheet{padding-bottom:34px}`

const PROTOTYPE_RUNTIME = `(function(){
var cur=null,stack=[],state={},showFns=[];
function q(s){return document.querySelector(s)}
function esc(v){return String(v).replace(/["\\\\]/g,"\\\\$&")}
function screen(id){return q('[data-screen="'+esc(id)+'"]')}
function tell(){try{parent.postMessage({type:"proto:screen",id:cur,canBack:stack.length>0},"*")}catch(e){}}
function show(id,mode){var t=screen(id);if(!t)return;
document.querySelectorAll("[data-screen]").forEach(function(s){s.hidden=s!==t});
document.querySelectorAll("[data-overlay]").forEach(function(o){o.hidden=true;o.classList.remove("wf-closing")});
if(mode!=="back"&&mode!=="none"&&cur&&cur!==id)stack.push(cur);
if(mode!=="none"&&cur&&cur!==id){t.classList.remove("wf-in-fwd","wf-in-back");void t.offsetWidth;t.classList.add(mode==="back"?"wf-in-back":"wf-in-fwd")}
cur=id;window.scrollTo(0,0);tell();render();showFns.forEach(function(f){run(f,id,t)})}
function report(e){try{parent.postMessage({type:"proto:error",message:String(e&&e.message||e).slice(0,300)},"*")}catch(_){}}
function run(f,a,b){try{f(a,b)}catch(e){report(e)}}
function render(){document.querySelectorAll("[data-bind]").forEach(function(el){var k=el.getAttribute("data-bind");if(k in state)el.textContent=state[k]});document.querySelectorAll("[data-show-if]").forEach(function(el){el.hidden=!state[el.getAttribute("data-show-if")]})}
function openO(id){var s=screen(cur),k=esc(id);var o=(s&&s.querySelector('[data-overlay="'+k+'"]'))||q('[data-overlay="'+k+'"]');if(o){o.classList.remove("wf-closing");o.hidden=false}}
window.addEventListener("error",function(e){report(e.message)});
window.prism={state:state,go:function(id){show(id)},back:function(){back()},open:openO,close:function(id){closeO(id?q('[data-overlay="'+esc(id)+'"]'):[].slice.call(document.querySelectorAll("[data-overlay]")).filter(function(x){return!x.hidden}).pop())},
set:function(k,v){if(k&&typeof k==="object"){for(var x in k)state[x]=k[x]}else state[k]=v;render()},get:function(k){return state[k]},current:function(){return cur},
onShow:function(f){showFns.push(f);if(cur)run(f,cur,screen(cur))},error:report};
function back(){if(stack.length)show(stack.pop(),"back")}
function closeO(o){if(!o||o.hidden||o.classList.contains("wf-closing"))return;o.classList.add("wf-closing");setTimeout(function(){o.hidden=true;o.classList.remove("wf-closing")},200)}
function hint(){document.body.classList.add("wf-proto-hint");clearTimeout(hint.t);hint.t=setTimeout(function(){document.body.classList.remove("wf-proto-hint")},700)}
document.addEventListener("click",function(e){
if(e.target.matches&&e.target.matches("[data-overlay]")){closeO(e.target);return}
var el=e.target.closest("[data-go],[data-back],[data-open],[data-close],a[href^='#']");
if(!el){if(!e.target.closest("input,textarea,select,label,summary,.wf-proto-nav"))hint();return}
e.preventDefault();
if(el.hasAttribute("data-back"))back();
else if(el.getAttribute("data-go"))show(el.getAttribute("data-go"));
else if(el.getAttribute("data-open"))openO(el.getAttribute("data-open"));
else if(el.hasAttribute("data-close")){var n=el.getAttribute("data-close");var o2=n?q('[data-overlay="'+esc(n)+'"]'):el.closest("[data-overlay]");closeO(o2)}
else if(el.matches("a[href^='#']")){var h=decodeURIComponent(el.getAttribute("href").slice(1));if(screen(h))show(h);if(el.closest(".wf-proto-nav"))el.closest("details").open=false}
},true);
document.addEventListener("keydown",function(e){if(e.key==="Escape"){var o=[].slice.call(document.querySelectorAll("[data-overlay]")).filter(function(x){return!x.hidden}).pop();if(o)closeO(o);else back()}});
window.addEventListener("message",function(e){var d=e.data||{};if(d.type==="proto:go")show(d.id);if(d.type==="proto:back")back();if(d.type==="proto:restart"){stack=[];cur=null;show(document.body.getAttribute("data-start"),"none")}});
show(document.body.getAttribute("data-start"),"none");
})();`

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "screen"

/** Sanitize a screen and hide its overlays until opened (so static thumbnails show the resting state). */
export function prepareScreenHtml(html: string): string {
  return sanitizeWireframe(html).replace(/<([a-z][a-z0-9]*)(\s[^>]*?)?\sdata-overlay=/gi, (m, tag: string, attrs = "") => (/\shidden\b/i.test(attrs) ? m : `<${tag}${attrs} hidden data-overlay=`))
}

export const screenSlug = (s: string) => slug(s)

function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

/**
 * Normalise a batch of the agent's screens: unique slug ids, sanitized HTML, links rewritten to the ids.
 * `known` are ids of screens already built or planned, so links to them resolve too.
 */
export function normalizeScreens(input: { id?: string; title: string; html: string }[], known: string[] = []): { screens: PrototypeScreen[]; rename: Map<string, string> } {
  const rename = new Map<string, string>()
  const used = new Set<string>()
  const screens = input.map((s) => {
    let id = slug(s.id || s.title)
    for (let n = 2; used.has(id); n++) id = `${slug(s.id || s.title)}-${n}`
    used.add(id)
    if (s.id) rename.set(s.id, id)
    rename.set(s.title, rename.get(s.title) ?? id)
    return { id, title: s.title.slice(0, 60), html: minifyHtml(s.html) }
  })
  const all = new Set([...used, ...known])
  const fix = (v: string) => rename.get(v) ?? rename.get(slug(v)) ?? (all.has(slug(v)) ? slug(v) : v)
  for (const s of screens) s.html = prepareScreenHtml(s.html).replace(/data-go\s*=\s*(["'])(.*?)\1/gi, (_, q: string, v: string) => `data-go=${q}${fix(v)}${q}`)
  return { screens, rename }
}

/** Links that point nowhere and screens nothing links to, so the agent can fix its flow. Links to planned screens count as pending. */
export function checkPrototype(screens: PrototypeScreen[], start: string, planned: string[] = []) {
  const ids = new Set(screens.map((s) => s.id))
  const later = new Set(planned.filter((p) => !ids.has(p)))
  const broken: string[] = []
  const reached = new Set([start])
  for (const s of screens) {
    const overlays = new Set([...s.html.matchAll(/data-overlay\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]))
    for (const m of s.html.matchAll(/data-go\s*=\s*["']([^"']+)["']/gi)) {
      if (ids.has(m[1])) reached.add(m[1])
      else if (!later.has(m[1])) broken.push(`${s.id} → ${m[1]}`)
    }
    for (const m of s.html.matchAll(/data-open\s*=\s*["']([^"']+)["']/gi)) if (!overlays.has(m[1])) broken.push(`${s.id} opens missing overlay ${m[1]}`)
  }
  const unreachable = screens.filter((s) => !reached.has(s.id)).map((s) => s.id)
  return { broken: [...new Set(broken)], unreachable }
}

/** The whole prototype as one document. `standalone` adds a title and a screen menu for the downloaded file. */
/** Prototypes may run model-written script: allow inline code, styles, fonts and images, but no network calls or form posts. */
const PROTOTYPE_CSP = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src * data: blob:; media-src * data: blob:; connect-src 'none'; form-action 'none'`

export function buildPrototypeDoc(screens: PrototypeScreen[], start: string, extraCss = "", opts: { title?: string; standalone?: boolean; width?: number; script?: string } = {}): string {
  const imports = (extraCss.match(/@import[^;]+;/g) ?? []).join("")
  const rest = extraCss.replace(/@import[^;]+;/g, "")
  const first = screens.some((s) => s.id === start) ? start : screens[0]?.id
  const frame = opts.standalone && opts.width ? `html{background:#ececec}body{max-width:${opts.width}px;margin:0 auto;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 20px 60px rgba(0,0,0,.12);min-height:100vh}.wf-overlay{left:50%;right:auto;width:100%;max-width:${opts.width}px;transform:translateX(-50%)}` : ""
  const nav = opts.standalone
    ? `<details class="wf-proto-nav"><summary>Screens</summary><div>${screens.map((s) => `<a href="#${encodeURIComponent(s.id)}">${escapeHtml(s.title)}</a>`).join("")}</div></details>`
    : ""
  const body = screens.map((s) => `<section data-screen="${escapeHtml(s.id)}" data-title="${escapeHtml(s.title)}"${s.id === first ? "" : " hidden"}>${prepareScreenHtml(s.html)}</section>`).join("\n")
  // The model's script runs after the runtime, so window.prism exists; a closing tag inside it can't end the block early.
  const script = opts.script?.trim() ? `<script>(function(){try{\n${opts.script.replace(/<\/script/gi, "<\\/script")}\n}catch(e){prism.error(e)}})()</script>` : ""
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${PROTOTYPE_CSP}"><meta name="viewport" content="width=device-width,initial-scale=1">${opts.title ? `<title>${escapeHtml(opts.title)}</title>` : ""}<style>${imports}${WF_BASE_CSS}${PROTOTYPE_CSS}${frame}${rest}</style></head><body data-start="${escapeHtml(first ?? "")}">${body}${nav}<script>${PROTOTYPE_RUNTIME}</script>${script}</body></html>`
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
}
