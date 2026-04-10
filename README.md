# Framework

Minimal SSR/SPA hybrid built on Vite. Node dev server, Bun prod server, streaming NDJSON renderer, SPA router with transitions.

## Stack

| | |
|---|---|
| Dev server | Node.js HTTP + Vite middleware (HMR) |
| Prod server | Bun.serve with gzip |
| Renderer | `entry-server.js` → NDJSON stream (body first, cache second) |
| Router | SPA client router, prefetch on hover, CSS transitions, page cache |
| Scroll | Lenis smooth scroll (desktop only, lerp 0.09) |
| Text | `splitText` server-side (words/chars), `splitLines` client-side via OffscreenCanvas |
| Media | IntersectionObserver lazy fade-in for `img/video[loading="lazy"]` |
| Grid | `<grid-layout count="12">` web component, toggle with `Shift+G` |
| Lifecycle | `emit(name, detail)` / `on(name, fn)` event bus |

## Commands

| | |
|---|---|
| Dev | `pnpm dev` |
| Build client | `pnpm build` |
| Build server | `pnpm build:server` |
| Preview SSR | `pnpm preview` |
| Preview static | `pnpm preview:static` |
| Prerender | `pnpm prerender` |

**Static mode** prerenders all routes to `dist/render.json` at build time — no SSR at runtime.

## Structure

```
src/
  entry-client.js     # client bootstrap, fetches first render, inits router
  entry-server.js     # SSR renderer, exports render(url) / renderAll()
  layout.html         # shared layout (nav, etc.)
  style.css           # global styles
  data/
    projects.js       # project data (slug, title, year, imgs)
  pages/
    home.html
    about.html
  assets/
    router.ts         # SPA router
    lifecycle.js      # event bus
    scroll.js         # Lenis wrapper
    text-split.js     # splitText / splitLines
    media.js          # lazy load observer
    grid.js           # grid overlay web component
    sound.js          # (disabled)
    experience.js     # three.js canvas
    lenis/            # lenis source
```

## Adding pages

**HTML route** — create `src/pages/your-page.html`, register in `entry-server.js`:

```js
import page from "./pages/your-page.html?raw";
const routes = {
  "/your-page": { html: page, title: "Title" },
};
```

**JS route** — return an HTML string from a function, spread into `routes`:

```js
// in entry-server.js
for (const p of projects) {
  processedRoutes[`/${p.slug}`] = {
    body: splitText(projectPage(p)),
    title: p.title,
  };
}
```

## Loader

Inline script in `index.html`. Tracks image loading for each page, shows a numeric progress counter (`#loader`, bottom-right, red).

**Flow:**
1. `loader:start` dispatched → counter appears at `0`
2. All `img[src]` inside `#_root` (or new page element) are tracked via proxy `Image` objects
3. Each load/error increments the counter
4. On 100%, waits 200ms then hides and dispatches `loader:complete`

**Listen for completion:**
```js
window.addEventListener('loader:complete', () => {
  // page is fully loaded
});
```

**Tracking arbitrary assets** — use `trackPromise` for GLBs, audio, or any async load. Pass the actual loading promise to avoid double-downloading:

```js
import { trackPromise } from './assets/loader.js';

trackPromise(gltfLoader.loadAsync('/model.glb'));
trackPromise(fetch('/data.json'), audioCtx.decodeAudioData(buf));
```

Accepts multiple promises in one call. If any rejects, the loader still progresses.

**Preloading other pages** — add `prefetch: true` to a route in `entry-server.js` or a project in `data/projects.js`. Their images are tracked by the loader before it completes.

```js
// entry-server.js
const routes = {
  "/about": { html: about, title: "About", prefetch: true },
};

// data/projects.js
{ slug: "nike", title: "Nike", prefetch: true, imgs: [...] }
```

Prefetch data comes from the second NDJSON line already fetched on boot — no extra requests.

> `on('loader:complete', fn)` won't work — the event is dispatched from inline script via `window.dispatchEvent`, not through the lifecycle `emit`. Use `window.addEventListener` directly.

## Lifecycle events

All events go through `emit` / `on` from `lifecycle.js`, and are also dispatched on `window` as `CustomEvent`.

| Event | Detail | When |
|---|---|---|
| `loader:start` | `null` | navigation begins or initial load |
| `loader:complete` | `null` | images loaded + 2s delay |
| `page:before-insert` | `{ path, el }` | new page element built, before DOM insert |
| `page:mount` | `{ path }` | new page visible, old page removed |
| `page:destroy` | `{ path }` | old page just removed |
| `lenis:scroll` | `{ scroll, velocity, direction, progress }` | every Lenis scroll tick |

```js
import { on } from "./assets/lifecycle.js";

on("page:mount", ({ path }) => { ... });
on("lenis:scroll", ({ scroll, velocity }) => { ... });
```

## Router

`initRouter()` called once in `entry-client.js`. Intercepts all same-origin `<a href>` clicks.

- Fetches `path?render` as NDJSON — first line `{ body, title }`, second `{ cache }` (prefetched neighbors)
- Holds navigation until `loader:complete` fires (images done)
- Transition: old page `page-out` (dim + scale down + slide up), new page `page-in` (clip-path wipe from bottom)
- 15s timeout safety valve — forces `loader:complete` if images never settle
- Cache: `addToCache(data)` to seed manually, server sends neighbor pages in the second NDJSON line

## Text splitting

**Server-side** (`splitText`) — pure string transform, safe for SSR:
- `class="words"` → wraps each word in `<span class="word"><span class="word-inner">`
- `class="chars"` → wraps each char in `<span class="char"><span class="char-inner">`

**Client-side** (`splitLines`) — uses OffscreenCanvas to measure real line breaks:
- `class="lines"` → call `splitLines([...document.querySelectorAll('.lines')])`
- Outputs `<span class="line"><span class="line-inner">` per line
- `line-inner` starts at `translateY(150%)`, add class `on` to animate in

```js
// animate lines in after mount
on("page:mount", () => {
  splitLines([...document.querySelectorAll(".page .lines")]);
  document.querySelectorAll(".line-inner").forEach((el, i) => {
    setTimeout(() => el.classList.add("on"), i * 20);
  });
});
```

## Media

`img[loading="lazy"]` and `video[loading="lazy"]` fade in when they enter the viewport (200px rootMargin). Observer resets on every `page:mount`.

```html
<img src="..." loading="lazy" width="800" height="600">
```

## Grid overlay

`<grid-layout count="12">` renders a fixed 12-column overlay. Toggle visibility with `Shift+G`. Columns are red at 10% opacity. Configured in `index.html`, column count set via attribute.
