import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const libraryDirectory = path.resolve(scriptDirectory, "../../visual-research");
const catalogPath = path.join(libraryDirectory, "catalog.json");
const indexPath = path.join(libraryDirectory, "index.md");
const outputPath = path.join(libraryDirectory, "visual-research.html");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const index = fs.readFileSync(indexPath, "utf8");

const existingEnrichment = new Map();
if (fs.existsSync(outputPath)) {
  const existingHtml = fs.readFileSync(outputPath, "utf8");
  const marker = '<script id="catalog" type="application/json">';
  const start = existingHtml.indexOf(marker);
  const end = existingHtml.indexOf("</script>", start + marker.length);
  if (start >= 0 && end > start) {
    try {
      const existingData = JSON.parse(existingHtml.slice(start + marker.length, end));
      for (const reference of existingData.references ?? []) {
        existingEnrichment.set(reference.id, {
          description: reference.description ?? "",
          visible_text: reference.visible_text ?? "",
        });
      }
    } catch {
      // A malformed previous gallery should not block regeneration from canonical inputs.
    }
  }
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

const ignoredHeadings = new Set(["Pattern clusters", "Evidence quality", "Source and copying boundary"]);
const categoryMap = new Map();
const tagsByReference = new Map();
let currentCategory = null;

for (const line of index.split(/\r?\n/)) {
  const heading = line.match(/^###\s+(.+)$/);
  if (heading) {
    const title = heading[1].trim();
    currentCategory = ignoredHeadings.has(title) ? null : title;
    if (currentCategory && !categoryMap.has(currentCategory)) {
      categoryMap.set(currentCategory, []);
    }
    continue;
  }

  if (!currentCategory) continue;
  for (const match of line.matchAll(/ref-\d{3}/g)) {
    const id = match[0];
    if (!tagsByReference.has(id)) tagsByReference.set(id, []);
    if (!tagsByReference.get(id).includes(currentCategory)) {
      tagsByReference.get(id).push(currentCategory);
      categoryMap.get(currentCategory).push(id);
    }
  }
}

const references = catalog.references.map((reference) => ({
  ...reference,
  title: decodeHtmlEntities(reference.title.replace(/\s+Pin page$/i, "").trim()),
  patterns: tagsByReference.get(reference.id) ?? [],
  description: existingEnrichment.get(reference.id)?.description ?? "",
  visible_text: existingEnrichment.get(reference.id)?.visible_text ?? "",
}));

const categories = [...categoryMap.keys()].map((title) => ({
  title,
  count: categoryMap.get(title).length,
}));

const data = JSON.stringify({
  name: catalog.name,
  source_board: catalog.source_board,
  references,
  categories,
}).replaceAll("<", "\\u003c");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Prism · App-screen inspiration</title>
  <style>
    :root {
      color-scheme: light;
      --page: #f1f1ee;
      --surface: #ffffff;
      --ink: #181917;
      --muted: #686b66;
      --line: #dcded9;
      --accent: #236b47;
      --accent-soft: #e8f3ec;
      --focus: #286ce2;
      --shadow: 0 18px 60px rgba(24, 25, 23, 0.13);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--page);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    button, input { font: inherit; }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      padding: 24px clamp(18px, 4vw, 56px) 18px;
      border-bottom: 1px solid rgba(24, 25, 23, 0.12);
      background: color-mix(in srgb, var(--page) 92%, transparent);
      backdrop-filter: blur(18px);
    }

    .heading-row {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
    }

    h1 {
      margin: 0;
      font-size: clamp(26px, 3vw, 42px);
      letter-spacing: -0.045em;
      line-height: 1;
    }

    .summary {
      margin-top: 8px;
      color: var(--muted);
      font-size: 14px;
    }

    .board-link {
      color: var(--ink);
      font-size: 13px;
      text-underline-offset: 3px;
    }

    .controls {
      display: grid;
      grid-template-columns: minmax(220px, 420px) 1fr;
      gap: 14px;
      align-items: center;
      margin-top: 20px;
    }

    .search {
      width: 100%;
      min-height: 44px;
      padding: 0 15px;
      border: 1px solid var(--line);
      border-radius: 12px;
      outline: none;
      background: var(--surface);
      color: var(--ink);
    }

    .search:focus { border-color: var(--focus); box-shadow: 0 0 0 3px rgba(40, 108, 226, 0.14); }

    .filters {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 2px 0 4px;
      scrollbar-width: thin;
    }

    .filter {
      flex: 0 0 auto;
      min-height: 38px;
      padding: 0 13px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      white-space: nowrap;
      font-size: 13px;
    }

    .filter[aria-pressed="true"] {
      border-color: var(--accent);
      background: var(--accent);
      color: white;
    }

    main { padding: 28px clamp(14px, 3vw, 44px) 60px; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 14px;
      max-width: 1800px;
      margin: 0 auto;
    }

    .card {
      position: relative;
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--surface);
      cursor: zoom-in;
      transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
    }

    .card:hover { transform: translateY(-2px); border-color: #b8bbb5; box-shadow: 0 8px 30px rgba(24, 25, 23, 0.09); }
    .card:focus-visible { outline: 3px solid rgba(40, 108, 226, 0.45); outline-offset: 2px; }
    .card[hidden] { display: none; }

    .image-box {
      display: grid;
      place-items: center;
      width: 100%;
      aspect-ratio: 4 / 5;
      padding: 12px;
      overflow: hidden;
      background:
        linear-gradient(45deg, #f7f7f5 25%, transparent 25%),
        linear-gradient(-45deg, #f7f7f5 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f7f7f5 75%),
        linear-gradient(-45deg, transparent 75%, #f7f7f5 75%),
        #fdfdfc;
      background-size: 18px 18px;
      background-position: 0 0, 0 9px, 9px -9px, -9px 0;
    }

    .image-box img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .card-body { padding: 13px 14px 15px; border-top: 1px solid var(--line); }

    .id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 15px;
      font-weight: 750;
      letter-spacing: -0.02em;
    }

    .title {
      min-height: 17px;
      margin-top: 7px;
      overflow: hidden;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .description {
      min-height: 52px;
      margin-top: 7px;
      overflow: hidden;
      color: var(--ink);
      font-size: 12px;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .tag-row { display: flex; gap: 5px; margin-top: 10px; overflow: hidden; }

    .tag {
      max-width: 100%;
      overflow: hidden;
      padding: 4px 7px;
      border-radius: 6px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 10px;
      line-height: 1;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      max-width: 580px;
      margin: 100px auto;
      text-align: center;
      color: var(--muted);
    }

    dialog {
      width: min(1180px, calc(100vw - 28px));
      height: min(880px, calc(100vh - 28px));
      padding: 0;
      overflow: hidden;
      border: 0;
      border-radius: 20px;
      background: var(--surface);
      color: var(--ink);
      box-shadow: var(--shadow);
    }

    dialog::backdrop { background: rgba(14, 15, 14, 0.76); backdrop-filter: blur(7px); }

    .viewer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      height: 100%;
    }

    .viewer-image {
      display: grid;
      place-items: center;
      min-width: 0;
      min-height: 0;
      padding: 22px;
      background: #e8e9e5;
    }

    .viewer-image img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }

    .viewer-info { display: flex; flex-direction: column; min-width: 0; padding: 22px; border-left: 1px solid var(--line); }
    .viewer-info h2 { margin: 10px 0 0; font-size: 28px; letter-spacing: -0.04em; }
    .viewer-title { margin: 12px 0 0; color: var(--muted); font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
    .viewer-description { margin: 16px 0 0; color: var(--ink); font-size: 14px; line-height: 1.55; }
    .viewer-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 18px; }
    .viewer-tags .tag { font-size: 11px; padding: 6px 8px; }

    .viewer-actions { display: grid; gap: 9px; margin-top: auto; }
    .viewer-actions a, .viewer-actions button {
      display: grid;
      place-items: center;
      min-height: 42px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      text-decoration: none;
    }
    .viewer-actions a { border-color: var(--accent); background: var(--accent); color: white; }

    .close {
      align-self: end;
      width: 38px;
      height: 38px;
      border: 1px solid var(--line);
      border-radius: 50%;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
    }

    .viewer-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 9px; }

    @media (max-width: 760px) {
      .heading-row { align-items: start; flex-direction: column; gap: 10px; }
      .controls { grid-template-columns: 1fr; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
      main { padding-inline: 9px; }
      .image-box { padding: 7px; }
      .card-body { padding: 10px; }
      .viewer { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) auto; }
      .viewer-info { max-height: 280px; border-top: 1px solid var(--line); border-left: 0; }
      .viewer-info h2 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="heading-row">
      <div>
        <h1>App-screen inspiration</h1>
        <div class="summary"><span id="visibleCount">300</span> of 300 references · Select a card to inspect it</div>
      </div>
      <a class="board-link" href="${catalog.source_board}" target="_blank" rel="noreferrer">Pinterest source board ↗</a>
    </div>
    <div class="controls">
      <input class="search" id="search" type="search" placeholder="Search ID, title, pattern, or user job…" autocomplete="off" aria-label="Search references">
      <div class="filters" id="filters" aria-label="Pattern filters"></div>
    </div>
  </header>

  <main>
    <section class="grid" id="grid" aria-live="polite"></section>
    <div class="empty" id="empty" hidden>No references match this search. Try a broader user job or clear the pattern filter.</div>
  </main>

  <dialog id="dialog" aria-labelledby="viewerId">
    <div class="viewer">
      <div class="viewer-image"><img id="viewerImage" alt=""></div>
      <aside class="viewer-info">
        <button class="close" id="close" type="button" aria-label="Close">×</button>
        <h2 id="viewerId"></h2>
        <p class="viewer-title" id="viewerTitle"></p>
        <p class="viewer-description" id="viewerDescription"></p>
        <div class="viewer-tags" id="viewerTags"></div>
        <div class="viewer-actions">
          <a id="sourceLink" href="#" target="_blank" rel="noreferrer">Open Pinterest source</a>
          <button id="copyId" type="button">Copy reference ID</button>
          <div class="viewer-nav">
            <button id="previous" type="button">← Previous</button>
            <button id="next" type="button">Next →</button>
          </div>
        </div>
      </aside>
    </div>
  </dialog>

  <script id="catalog" type="application/json">${data}</script>
  <script>
    const library = JSON.parse(document.getElementById("catalog").textContent);
    const grid = document.getElementById("grid");
    const search = document.getElementById("search");
    const filters = document.getElementById("filters");
    const empty = document.getElementById("empty");
    const visibleCount = document.getElementById("visibleCount");
    const dialog = document.getElementById("dialog");
    const viewerImage = document.getElementById("viewerImage");
    const viewerId = document.getElementById("viewerId");
    const viewerTitle = document.getElementById("viewerTitle");
    const viewerDescription = document.getElementById("viewerDescription");
    const viewerTags = document.getElementById("viewerTags");
    const sourceLink = document.getElementById("sourceLink");
    const copyId = document.getElementById("copyId");
    let activePattern = "All";
    let visibleReferences = [];
    let currentReference = null;

    function tagLabel(value) {
      return value
        .replace("Health metrics, results, and insight hierarchy", "Health insights")
        .replace("Cards, carousels, and browsable collections", "Collections")
        .replace("Comparison, recommendation, and consequential choice", "Comparison")
        .replace("Progress, feedback, success, streaks, and rewards", "Progress & feedback")
        .replace("Bottom sheets, overlays, and focused moments", "Overlays")
        .replace("Onboarding, questions, input, and guided setup", "Guided input")
        .replace("Commerce, package, offer, cart, and membership", "Commerce")
        .replace("Scheduling, maps, delivery, and time-based activity", "Time & location")
        .replace("AI assistance, generated content, and conversational control", "AI assistance")
        .replace("High-expression visual thesis and illustration", "Visual thesis");
    }

    function createFilters() {
      const choices = [{ title: "All", count: library.references.length }, ...library.categories];
      for (const choice of choices) {
        const button = document.createElement("button");
        button.className = "filter";
        button.type = "button";
        button.textContent = choice.title === "All" ? "All · " + choice.count : tagLabel(choice.title) + " · " + choice.count;
        button.setAttribute("aria-pressed", choice.title === activePattern ? "true" : "false");
        button.addEventListener("click", () => {
          activePattern = choice.title;
          for (const item of filters.children) item.setAttribute("aria-pressed", "false");
          button.setAttribute("aria-pressed", "true");
          applyFilters();
        });
        filters.append(button);
      }
    }

    function createCards() {
      const fragment = document.createDocumentFragment();
      for (const reference of library.references) {
        const card = document.createElement("article");
        card.className = "card";
        card.tabIndex = 0;
        card.dataset.id = reference.id;
        card.dataset.search = [reference.id, reference.title, reference.description, reference.visible_text, ...reference.patterns].join(" ").toLowerCase();
        const imageBox = document.createElement("div");
        imageBox.className = "image-box";
        const image = document.createElement("img");
        image.src = reference.image;
        image.alt = reference.id + ": " + reference.title;
        image.loading = "lazy";
        image.decoding = "async";
        imageBox.append(image);

        const body = document.createElement("div");
        body.className = "card-body";
        const id = document.createElement("div");
        id.className = "id";
        id.textContent = "#" + reference.id.slice(4);
        const title = document.createElement("div");
        title.className = "title";
        title.textContent = reference.title;
        const description = document.createElement("div");
        description.className = "description";
        description.textContent = reference.description || "Open to inspect this visual reference.";
        const tagRow = document.createElement("div");
        tagRow.className = "tag-row";
        for (const pattern of reference.patterns.slice(0, 2)) {
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = tagLabel(pattern);
          tagRow.append(tag);
        }
        body.append(id, title, description, tagRow);
        card.append(imageBox, body);
        card.addEventListener("click", () => openReference(reference));
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openReference(reference);
          }
        });
        fragment.append(card);
      }
      grid.append(fragment);
    }

    function applyFilters() {
      const query = search.value.trim().toLowerCase();
      visibleReferences = [];
      for (const reference of library.references) {
        const card = grid.querySelector('[data-id="' + reference.id + '"]');
        const matchesPattern = activePattern === "All" || reference.patterns.includes(activePattern);
        const matchesQuery = !query || card.dataset.search.includes(query);
        const visible = matchesPattern && matchesQuery;
        card.hidden = !visible;
        if (visible) visibleReferences.push(reference);
      }
      visibleCount.textContent = visibleReferences.length;
      empty.hidden = visibleReferences.length !== 0;
    }

    function openReference(reference) {
      currentReference = reference;
      viewerImage.src = reference.image;
      viewerImage.alt = reference.id + ": " + reference.title;
      viewerId.textContent = "#" + reference.id.slice(4);
      viewerTitle.textContent = reference.title;
      viewerDescription.textContent = reference.description || "Open the image to inspect its visible structure and state.";
      viewerTags.replaceChildren(...reference.patterns.map((pattern) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = tagLabel(pattern);
        return tag;
      }));
      sourceLink.href = reference.pin_url;
      history.replaceState(null, "", "#" + reference.id);
      if (!dialog.open) dialog.showModal();
    }

    function move(direction) {
      const index = visibleReferences.findIndex((reference) => reference.id === currentReference?.id);
      if (index < 0 || visibleReferences.length === 0) return;
      const nextIndex = (index + direction + visibleReferences.length) % visibleReferences.length;
      openReference(visibleReferences[nextIndex]);
    }

    search.addEventListener("input", applyFilters);
    document.getElementById("close").addEventListener("click", () => dialog.close());
    document.getElementById("previous").addEventListener("click", () => move(-1));
    document.getElementById("next").addEventListener("click", () => move(1));
    copyId.addEventListener("click", async () => {
      if (!currentReference) return;
      try {
        if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(currentReference.id);
      } catch {
        const helper = document.createElement("textarea");
        helper.value = currentReference.id;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.append(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      copyId.textContent = "Copied";
      setTimeout(() => { copyId.textContent = "Copy reference ID"; }, 1000);
    });
    dialog.addEventListener("close", () => {
      currentReference = null;
      history.replaceState(null, "", location.pathname + location.search);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    window.addEventListener("keydown", (event) => {
      if (!dialog.open) return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    });

    createFilters();
    createCards();
    applyFilters();

    const initialId = location.hash.match(/ref-\d{3}/)?.[0];
    const initialReference = library.references.find((reference) => reference.id === initialId);
    if (initialReference) openReference(initialReference);
  </script>
</body>
</html>
`;

fs.writeFileSync(outputPath, html);
console.log(`Created ${outputPath} with ${references.length} references and ${categories.length} filters`);
