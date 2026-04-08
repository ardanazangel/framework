# Framework

Minimal SSR/SPA framework built on Vite.

## Stack

- **Dev server** — Node.js HTTP + Vite middleware (HMR)
- **Prod server** — Bun.serve with gzip compression
- **Renderer** — `entry-server.js` exports `renderAll(url)` → streams NDJSON (body first, cache second)
- **Router** — SPA router with CSS animations, hover prefetch, and page cache
- **Scroll** — Lenis smooth scroll, desktop-only
- **Text** — `splitText` (server, words/chars), `splitLines` (client, line-breaking via canvas)
- **Lifecycle** — `emit(name, detail)` / `on(name, fn)` event bus

## Commands

| | Command |
|---|---|
| Dev | `pnpm dev` |
| Build client | `pnpm build` |
| Build server | `pnpm build:server` |
| Preview (SSR) | `pnpm preview` |
| Preview (static) | `pnpm preview:static` |
| Prerender only | `pnpm prerender` |

**Static mode** prerenders all routes to `dist/render.json` at build time — no SSR at runtime.

## Adding pages

**HTML route** — create `src/pages/your-page.html`, import and register in `entry-server.js`:

```js
import page from "./pages/your-page.html?raw";
const routes = { "/your-page": { html: page, title: "Title" } };
```

**JS route** — export a function that returns an HTML string, then spread into `routes`:

```js
import { projectPage } from "./pages/project.js";
...Object.fromEntries(projects.map(p => [`/work/${p.slug}`, { html: projectPage(p), title: p.title }]))
```

## Page lifecycle events

| Event | Detail |
|---|---|
| `page:before-insert` | `{ path, el }` — new page element before DOM insert |
| `page:mount` | `{ path }` — new page visible |
| `page:destroy` | `{ path }` — old page removed |
| `loader:start` | `null` |
| `loader:done` | `null` |

## Dev notes

- `scroll.js` only loads on desktop (`navigator.userAgentData.mobile`)
- Text split classes: `words`, `chars` (server-side via `splitText`), `lines` (client-side via `splitLines`)
- Router fetches `?render` as NDJSON — first line is `{ body, title }`, second is `{ cache }`
- Hashed assets (`file.abc123.js`) get `Cache-Control: immutable`, everything else gets `no-cache`
