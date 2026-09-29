import type { Device } from "./types"

export const DEVICE_SIZES: Record<Device, { w: number; h: number }> = {
  mobile: { w: 390, h: 844 },
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
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${WF_BASE_CSS}${extraCss}</style></head><body>${clean}</body></html>`
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

// ───────── Example wireframes (used for the seeded example and the offline demo agent) ─────────

const status = `<div class="wf-status"><span>9:41</span><span>●●● ▲ ▮</span></div>`

export const EXAMPLE_WIREFRAMES: { title: string; summary: string; html: string }[] = [
  {
    title: "Reserve a table",
    summary: "Baseline: party size, date and time slots in one bottom sheet.",
    html: `<div class="wf-screen">${status}
<div class="wf-img" style="height:210px;border-radius:0"></div>
<div class="wf-body" style="position:relative;margin-top:-26px;background:#fff;border-radius:18px 18px 0 0">
  <div class="wf-col" style="gap:4px"><div class="wf-h1">Stella</div><div class="wf-text">Italian · $$ · Burlingame Ave · 0.8 mi</div></div>
  <div class="wf-row"><span class="wf-tag">4.7 ★ (1.2k)</span><span class="wf-tag">Outdoor seating</span></div>
  <div class="wf-divider"></div>
  <div class="wf-h3">Find a reservation</div>
  <div class="wf-grid" style="grid-template-columns:1fr 1fr">
    <div class="wf-input" style="color:#1d1d1f">👤 2 guests</div>
    <div class="wf-input" style="color:#1d1d1f">📅 Sat, Mar 29</div>
  </div>
  <div class="wf-label">Available times</div>
  <div class="wf-grid" style="grid-template-columns:repeat(4,1fr)">
    <span class="wf-chip">5:30</span><span class="wf-chip">6:00</span><span class="wf-chip wf-chip-on">6:15</span><span class="wf-chip">7:45</span>
    <span class="wf-chip">8:00</span><span class="wf-chip">8:30</span><span class="wf-chip">9:00</span><span class="wf-chip">9:15</span>
  </div>
  <div class="wf-muted">Reservations powered by our booking partner</div>
</div>
<div class="wf-footer"><div class="wf-btn wf-btn-primary wf-btn-block">Continue</div></div>
</div>`,
  },
  {
    title: "Reserve a table",
    summary: "Time slots grouped by sitting; seating preference and deposit shown before commit.",
    html: `<div class="wf-screen">${status}
<div class="wf-bar"><div class="wf-icon"></div><div class="wf-title">Stella · Reserve</div><div class="wf-icon"></div></div>
<div class="wf-body">
  <div class="wf-card wf-row" style="gap:12px"><div class="wf-img" style="width:56px;height:56px;min-height:0"></div><div class="wf-col" style="gap:2px"><div class="wf-h3">Stella</div><div class="wf-muted">Italian · Burlingame Ave · Free cancellation until 4 pm</div></div></div>
  <div class="wf-col" style="gap:8px"><div class="wf-label">Party size</div>
    <div class="wf-scroll-x"><span class="wf-chip">1</span><span class="wf-chip wf-chip-on">2</span><span class="wf-chip">3</span><span class="wf-chip">4</span><span class="wf-chip">5</span><span class="wf-chip">6+</span></div></div>
  <div class="wf-col" style="gap:8px"><div class="wf-label">Date</div>
    <div class="wf-scroll-x"><span class="wf-chip">Today</span><span class="wf-chip">Fri 28</span><span class="wf-chip wf-chip-on">Sat 29</span><span class="wf-chip">Sun 30</span><span class="wf-chip">📅 More</span></div></div>
  <div class="wf-col" style="gap:10px"><div class="wf-between"><div class="wf-label">Early evening</div><span class="wf-muted">3 left</span></div>
    <div class="wf-grid" style="grid-template-columns:repeat(3,1fr)"><span class="wf-chip">5:30 pm</span><span class="wf-chip">6:00 pm</span><span class="wf-chip wf-chip-on">6:15 pm</span></div>
    <div class="wf-between"><div class="wf-label">Late</div><span class="wf-muted">Filling fast</span></div>
    <div class="wf-grid" style="grid-template-columns:repeat(3,1fr)"><span class="wf-chip">8:00 pm</span><span class="wf-chip">8:30 pm</span><span class="wf-chip">9:15 pm</span></div></div>
  <div class="wf-fill wf-between"><div class="wf-col" style="gap:2px"><div class="wf-h3">Seating</div><div class="wf-muted">Indoor · Patio · Bar</div></div><span class="wf-chip">Indoor ▾</span></div>
</div>
<div class="wf-footer"><div class="wf-between"><span class="wf-muted">Sat 29 · 6:15 pm · 2 guests</span><span class="wf-muted">No deposit</span></div><div class="wf-btn wf-btn-primary wf-btn-block">Reserve 6:15 pm</div></div>
</div>`,
  },
  {
    title: "Reserve a table",
    summary: "Smart default: next best slot pre-selected, one-tap confirm, details collapsed.",
    html: `<div class="wf-screen">${status}
<div class="wf-img" style="height:150px;border-radius:0"></div>
<div class="wf-body">
  <div class="wf-between"><div class="wf-col" style="gap:2px"><div class="wf-h2">Stella</div><div class="wf-muted">Italian · 0.8 mi · 4.7 ★</div></div><span class="wf-tag">Dine-out deal −15%</span></div>
  <div class="wf-card wf-col" style="gap:10px;border-width:2px;border-color:#1d1d1f">
    <div class="wf-label">Best match for you</div>
    <div class="wf-between"><div class="wf-h1">6:15 pm</div><div class="wf-col" style="gap:0;text-align:right"><span class="wf-h3">Tonight</span><span class="wf-muted">2 guests · Indoor</span></div></div>
    <div class="wf-btn wf-btn-primary wf-btn-block">Reserve in one tap</div>
    <div class="wf-muted" style="text-align:center">Uses your saved name and phone</div>
  </div>
  <div class="wf-col" style="gap:8px"><div class="wf-label">Other times tonight</div>
    <div class="wf-scroll-x"><span class="wf-chip">5:30</span><span class="wf-chip">6:00</span><span class="wf-chip">7:45</span><span class="wf-chip">8:30</span><span class="wf-chip">9:15</span></div></div>
  <div class="wf-list">
    <div class="wf-between"><span>Change date or party size</span><span class="wf-muted">›</span></div>
    <div class="wf-between"><span>Special requests</span><span class="wf-muted">›</span></div>
    <div class="wf-between"><span>Cancellation policy</span><span class="wf-muted">Free until 4 pm ›</span></div>
  </div>
</div>
</div>`,
  },
]
