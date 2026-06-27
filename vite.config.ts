import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// Minimal Vite config. No framework plugins — the game is vanilla TS + Three.js.
// `@` resolves to `src/` to keep imports tidy across strict module boundaries.
//
// `base`: GitHub Pages serves a project repo under `/<repo>/`, so production
// builds are prefixed; the dev server stays at root. Override with the
// VITE_BASE env var (e.g. a custom domain or user/org Pages site → '/').
export default defineConfig(({ command }) => ({
  base:
    process.env.VITE_BASE ??
    (command === 'build' ? '/dino-dress-up/' : '/'),
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
}))
