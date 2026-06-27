import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// Minimal Vite config. No framework plugins — the game is vanilla TS + Three.js.
// `@` resolves to `src/` to keep imports tidy across strict module boundaries.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true, // expose on LAN so a real tablet can hit the dev server
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
