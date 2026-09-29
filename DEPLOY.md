# Deploy Design Agent Studio to Vercel

The app is a static Vite site plus two small serverless functions in `/api`:

- **`/api/config`** tells the app which providers this deployment has keys for. It never returns the keys.
- **`/api/p/<provider>/…`** (`api/proxy.ts`) forwards model and Figma requests with the server's key. It only forwards the endpoints the app needs, streams responses back, and requires the access code when one is set.

People can still use their own keys in Settings. A personal key always wins over the server's.

---

## 1. Put the code on GitHub

1. Unzip the project and open a terminal in the `design-agent-studio` folder.
2. Check it builds:
   ```bash
   npm install
   npm run build
   ```
3. Create an empty repository on GitHub (for example `design-agent-studio`), then push:
   ```bash
   git init
   git add .
   git commit -m "Design Agent Studio"
   git branch -M main
   git remote add origin https://github.com/<you>/design-agent-studio.git
   git push -u origin main
   ```
   `.gitignore` already keeps `node_modules`, `dist` and `.env` files out of the repo.

## 2. Import it into Vercel

1. Go to **vercel.com/new** and pick the repository.
2. Vercel reads `vercel.json`, so these should already be filled in. Check them:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
3. Don't deploy yet. Open **Environment Variables** first (next step).

## 3. Add your API key(s)

Under **Environment Variables**, add at least one model key. Use the names from `.env.example`:

| Name | Value | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-…` | console.anthropic.com → API keys |
| `OPENAI_API_KEY` | `sk-…` | platform.openai.com → API keys |
| `GOOGLE_API_KEY` | `AIza…` | aistudio.google.com → Get API key |
| `OPENROUTER_API_KEY` | `sk-or-…` | openrouter.ai → Keys |
| `FIGMA_TOKEN` *(optional)* | `figd_…` | Figma → Settings → Security → Personal access tokens (File content: read, Comments: write) |
| `ACCESS_CODE` | a long passphrase you choose | Anyone using your keys must enter this once |

**Set `ACCESS_CODE`.** Without it, anyone who finds the URL can run up charges on your keys. With it, the app asks for the code once and remembers it in that browser.

Apply the variables to **Production** (and **Preview** if you want preview deployments to work too).

## 4. Deploy

Click **Deploy**. When it finishes, open the URL:

1. The app asks for the access code. Enter the `ACCESS_CODE` value.
2. Open **Settings**. "This deployment" lists the providers that have server keys, and the model menu fills with their models.
3. On Home, type "Wireframe a checkout screen" to check the agent works end to end.

## 5. Changing keys later

In Vercel, go to **Project → Settings → Environment Variables**, edit the value, then **Deployments → … → Redeploy**. Functions only read new values after a redeploy.

---

## Deploying from the command line instead

```bash
npm i -g vercel
vercel login
vercel link                                   # create or link the project
vercel env add ANTHROPIC_API_KEY production   # paste the key when asked
vercel env add ACCESS_CODE production
vercel --prod
```

## Running the backend locally

`npm run dev` runs the front end only, so use your own keys in Settings. To run the functions too:

```bash
vercel env pull .env.local   # or copy .env.example to .env.local and fill it in
vercel dev
```

## Good to know

- **Custom domain:** Project → Settings → Domains.
- **Spend limits:** set a monthly limit in each provider's console. The access code keeps strangers out; it doesn't cap what your team uses.
- **Timeouts:** the proxy runs on Vercel's Edge runtime and streams, so long answers aren't cut off by the usual function timeout.
- **Screen sharing and the mic** (Live mode) work on the deployed site. They need HTTPS, which Vercel provides.
- **Connectors (MCP)** still connect straight from the browser. They only work with servers that accept requests from other sites (CORS).
- **What's stored where:** projects, design systems and personal keys live in each person's browser (IndexedDB). The server stores nothing. If you later want shared projects across a team, that needs a database, for example Vercel Postgres or Supabase.
