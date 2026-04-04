# Framework

Minimal SSR/SPA framework built on Vite. No React, no Vue — vanilla JS + custom router.

## Stack

- **Server** — Node.js HTTP server with optional Vite middleware in dev
- **Renderer** — `entry-server.js` exports `render(url)` and `renderAll()`
- **Router** — client-side SPA router with animated transitions and hover prefetch
- **Canvas** — Three.js / WebGPU scene, desktop-only
- **Scroll** — Lenis smooth scroll, desktop-only
- **Text** — `splitText` (server, words/chars), `splitLines` (client, line-breaking via canvas measurement)

## Modes

| Mode | Command |
|------|---------|
| Dev | `pnpm dev` |
| Preview (SSR) | `pnpm preview` |
| Preview (static) | `pnpm preview:static` |

**Static mode** prerenders all routes to `dist/render.json` at build time — no SSR at runtime.

## Adding pages

1. Create `src/pages/your-page.html`
2. Import and register it in `entry-server.js`

## Dev notes

- `experience.js` and `scroll.js` only load on desktop (`navigator.userAgentData.mobile`)
- Text split classes: `words`, `chars` (server-side), `lines` (client-side)
- Page transition events: `page:before-insert`, `page:mount`, `page:destroy`, `loader:start`, `loader:done`
