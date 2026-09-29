# Design Agent Studio

An AI design-crit workspace: sidebar (Chat / Live / Library), an infinite canvas in the middle and the Design Agent chat on the right. Built with React, Vite, Tailwind v4 and shadcn/ui.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static build in dist/
```

**Deploying to Vercel:** see [DEPLOY.md](DEPLOY.md). The `/api` folder adds a small proxy, so you can give the deployment its own API keys (behind an access code) and people don't need their own.

The agent needs a model: open **Settings**, add a key, click **Connect**, and the model menu fills with every model that key can use.

## How it's put together

**Dashboard** (sidebar: Create, Search ⌘K, Home, Files, Connectors, Context file, Design systems, Settings)

| Page | Where | What it does |
|---|---|---|
| Home | `src/components/pages/home-page.tsx` | "What can I help with?" composer with a + menu, a design system picker and a model picker. Sending starts a new project. Below it are quick actions and your recent projects, with search, filter, sort and a grid or list view. |
| Files | `src/components/pages/files-page.tsx` | Every project, plus an Assets tab listing all screenshots, wireframes and flows across projects. |
| Connectors | `src/components/pages/connectors-page.tsx`, `src/lib/mcp.ts` | Add MCP servers (Streamable HTTP or SSE, with a bearer token). They connect from the browser, list their tools, and give enabled servers' tools to the agent in every conversation. Includes suggestions for Figma, Linear, Notion, GitHub and Atlassian. |
| Context file | `src/components/pages/context-page.tsx` | What the product is and who it's for, shipped screens (each read by the model), a brief, documents, goals, constraints and voice. |
| Design systems | `src/components/pages/design-systems-page.tsx`, `src/lib/design-systems.ts` | Built-in systems (Wireframe, shadcn/ui, iOS native) plus your own. Your own sync from a Figma library, a tokens file or your screens, or you write them. You can edit colors, typeface, radius and the profile, with a live wireframe preview. Each project picks one: the agent follows its profile, and wireframes pick up its accent, radius and font. |
| Settings | `src/components/pages/settings-page.tsx` | Your name, AI provider keys, Figma token, voice, theme, and a button to clear local data. |

**Project** (`src/components/project/project-view.tsx`): a top bar with back, a renamable title, Canvas / Live tabs and the design system picker. Below it sit the canvas (or the Live stage) and the chat.

| Area | Where | Notes |
|---|---|---|
| State and persistence | `src/lib/store.ts` | Zustand, persisted to IndexedDB: projects, canvases, design systems, connectors, settings. |
| Providers and models | `src/lib/providers.ts` | Lists models live from each provider. Calls go straight from the browser through the Vercel AI SDK. |
| Agent | `src/lib/agent.ts` | Prompt built from the project's design system, the Context file and the canvas. Canvas tools, plus tools from connected MCP servers. |
| Canvas tools | `src/lib/canvas-actions.ts` | create/iterate wireframe (iterations are always new versions), annotate, comment, note, workflow, Figma comment. |
| Canvas | `src/components/canvas/` | Pan and zoom, selection, notes, comments, undo, drop and paste. |
| Figma | `src/lib/figma.ts` | Link parsing, frame export, comments, library styles and components. |
| Live | `src/components/live/` | Screen share, voice, frame capture, on-screen marks, snapshots. |

## Agent UI components

| Component | Where | Used for |
|---|---|---|
| Approval Card | `src/components/agents/approval-card.tsx` | The `ask_user` tool. The agent pauses until you answer: single or multiple choice, a custom answer, multi-step questions, or approve / request changes / reject. It collapses to the decision afterwards. |
| Todo List | `src/components/agents/todo-list.tsx` | The `update_plan` tool. It shows the agent's plan with morphing status marks and a rolling count, and collapses when everything is done. |
| Workflow graph | `src/components/agents/workflow-graph.tsx` | The `create_workflow` tool. Animated node graph: the main path flows, return paths are dashed loops, and a simulated run walks the graph once, including one pass round each loop. It appears full size on the canvas and as a compact vertical card in the chat, with a replay button. |
| Motion primitives | `src/components/motion/`, `src/lib/ease.ts` | Roll text and icon swaps, animated checkbox and radio, press-feedback buttons, and shared springs and curves. |

The Approval Card, Todo List, agent disclosure, action swap, checkbox, radio and motion tokens are adapted from [beUI](https://beui.dev/components/agents) (by Saurabh). Their colors are mapped to this app's theme tokens. Check beUI's license before you ship. The workflow graph was written for this app and modelled on the [evaluator workflow pattern](https://www.aisdkagents.com/patterns/wdk-workflows-evaluator-workflow).

## Keyboard

`V` select · `H` hand (or hold Space) · `N` note · `C` comment · `⌘Z` / `⇧⌘Z` undo/redo · `⌘0` fit · `⌘+` / `⌘−` zoom · `Delete` removes selection · `Esc` clears.

## Notes and limits

- **Keys in the browser.** This matches the original app's promise that nothing is stored on a server. Anthropic browser calls use the `anthropic-dangerous-direct-browser-access` header. If you later want shared/admin keys, add a small proxy route and point `getLanguageModel` at it.
- **Live mode** needs a desktop Chromium browser for screen share plus voice. Safari supports screen share but has weaker speech recognition. "Try it with an image" works everywhere.
- **Figma variables** need an Enterprise plan. Styles and components work on every plan.
- **Figma image URLs** are converted to data URLs when CORS allows. Otherwise the canvas keeps Figma's temporary URL, which expires after about 30 days.
- The shadcn components in `src/components/ui` are the stock new-york-v4 sources, copied from the shadcn repo. Only their import paths were changed.
# design-agent-studio
