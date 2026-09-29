import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// `npm run build` → normal multi-file build (deploy to Vercel/Netlify/any static host)
// `npm run build:single` → one self-contained HTML file (used for the hosted preview)
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), tailwindcss(), ...(mode === "single" ? [viteSingleFile()] : [])],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: { outDir: mode === "single" ? "dist-single" : "dist", chunkSizeWarningLimit: 4000 },
}))
