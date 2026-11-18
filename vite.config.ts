import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Two sites from one code base (src/lib/site.ts):
//   website     npm run dev        → :5173    npm run build        → dist/
//   backoffice  npm run dev:admin  → :5175    npm run build:admin  → dist-admin/
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const admin = mode === "admin"
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
    server: { port: admin ? 5175 : 5173, strictPort: true },
    preview: { port: admin ? 4175 : 4173 },
    build: { outDir: admin ? "dist-admin" : "dist" },
  }
})
