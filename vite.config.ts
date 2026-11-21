import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `--mode github-pages` builds for https://<user>.github.io/website/, where the
// site lives under a subpath. Every other build (Freebuff Sites, local dev)
// stays at the root.
export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/website/' : '/',
  plugins: [react(), tailwindcss(), cloudflare()],
  server: { port: 5173, strictPort: false },
}))
