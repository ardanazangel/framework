# Framework

Minimal SSR/SPA hybrid built on Vite. Node dev server, Bun prod server, streaming NDJSON renderer, SPA router with transitions.

## Stack

| | |
|---|---|
| Dev server | Node.js HTTP + Vite middleware (HMR) |
| Prod server | Node.js HTTP with gzip streaming |
| Renderer | `entry-server.js` → NDJSON stream (body first, cache second) |
| Router | SPA client router, prefetch on hover, CSS transitions, page cache |
| Scroll | Smooth scroll (desktop only, frame-rate independent damp) |
| Text | `splitText` server-side (words/chars), `lines.js` client-side via `@chenglou/pretext` |
| Media | Fade-in when `img`/`video` finishes loading |
| Grid | 12-column overlay module, toggle with `Shift+G` |
| Lifecycle | `emit(name, detail)` / `on(name, fn)` event bus |
| 3D | Three.js WebGPU canvas, fixed full-screen background (`z-index: -1`) |

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
    contact.html
  assets/
    boot.js           # initial NDJSON fetch, populates DOM + cache before router starts
    router.ts         # SPA router
    loader.js         # asset load tracker, progress counter, trackPromise API
    form.js           # schemas, renderForm (server), hydrateForm (client), validate (shared)
    scroll.js         # smooth scroll wrapper
    text-split.js     # splitText (server-side words/chars)
    media.js          # lazy load observer
    grid.js           # grid overlay, Shift+G to toggle
    sound.js          # (disabled)
    experience.js     # three.js WebGPU canvas
    scroll-engine/    # scroll engine source
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

## Lifecycle events

All events are dispatched on `window` as `CustomEvent`.

| Event | Detail | When |
|---|---|---|
| `loader:start` | — | navigation begins or initial load |
| `loader:complete` | — | images loaded + 200ms delay |
| `scroll:tick` | `{ scroll, velocity, direction }` | every scroll tick (desktop only) |
| `scroll:lock` / `scroll:unlock` | — | during page transitions |
| `scroll:reset` | — | reset scroll to 0 |
| `transition:end` | — | page-out animation finished |
| `win:resize` | `{ w, h, hw, wh, semi, dpr, isLandscape, isMobile }` | window resize |

```js
window.addEventListener('loader:complete', () => { ... });
window.addEventListener('scroll:tick', ({ detail: { scroll, velocity } }) => { ... });
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

**Client-side** (`lines.js`) — uses `@chenglou/pretext` (`prepareWithSegments` + `layoutWithLines`) to measure real line breaks against the computed font/width, then wraps each line in `<span class="line"><span class="line-inner">`:
- `class="lines"` → handled automatically by `lines.on()` on every `page:mount`
- `line-inner` starts at `translateY(150%)`, class `on` is added staggered to animate in
- On first load, waits for `document.fonts.ready` before splitting
- On client-side navigation, re-runs on `transition:end`

No manual calls needed — `lines` is registered as a module in `entry-client.js` and runs automatically.

## Media

`img` and `video` elements fade in once they finish loading (class `loaded` added on `load`/`loadeddata`). Runs on every `page:mount` via `media.on()`.

```html
<img src="..." width="800" height="600">
```

## Forms

Schemas defined in `src/assets/form.js`. Each schema maps to a `POST /api/:name` endpoint auto-registered at server startup, and to a `<form data-form="name">` in any page template.

**Adding a form:**

1. Add a schema to `form.js`:

```js
export const schemas = {
  contact: {
    action: '/api/contact',
    fields: [
      { name: 'name',    type: 'text',     label: 'Name',    required: true },
      { name: 'email',   type: 'email',    label: 'Email',   required: true },
      { name: 'message', type: 'textarea', label: 'Message', required: true, minLength: 10 },
    ],
  },
  login: {
    action: '/api/login',
    fields: [
      { name: 'email',    type: 'email',    label: 'Email',    required: true },
      { name: 'password', type: 'password', label: 'Password', required: true, minLength: 8 },
    ],
  },
  search: {
    action: '/api/search',
    fields: [
      { name: 'query', type: 'text', label: 'Search', required: true },
    ],
  },
}
```

2. Put `<form data-form="name">` in a page template — fields are injected server-side automatically:

```html
<form data-form="contact" class="form" novalidate></form>
```

That's it. The server renders the fields, the client hydrates validation and submit on `page:mount`.

**Validation** — runs on both sides from the same `validate` function in `form.js`:
- Client: inline errors per field, cleared on input
- Server: 400 + `{ errors }` if invalid, 200 + `{ ok: true }` if ok

**Field types:** `text`, `email`, `password`, `textarea`. Rules: `required`, `minLength`.

**Lifecycle events:**

| Event | Detail |
|---|---|
| `form:submit` | `{ action, body }` |
| `form:success` | `{ action }` |
| `form:error` | `{ action, error }` |

**Handling submissions** — add logic after the `console.log` in `server.js`:

```js
// TODO: handle validated data (send email, save to db, etc.)
console.log(`[form:${name}]`, body)
res.writeHead(200, { 'Content-Type': 'application/json' })
res.end(JSON.stringify({ ok: true }))
```

## Three.js / Experience

One WebGPU renderer, fixed full-screen canvas (`position: fixed; z-index: -1`). A single RAF loop shared with the scroll engine runs from module import — no manual start needed.

**Architecture:**

| | |
|---|---|
| `raf.js` | Global RAF loop. `class Raf` — `.run()` / `.stop()` to subscribe/unsubscribe |
| `experience.js` | WebGPU renderer + camera. Re-exports `THREE` and `Raf` — only place Three.js is imported |
| `pages/*.js` | Each page creates its own `THREE.Scene`, calls `setScene()`, disposes on destroy |

**Page module pattern:**

```js
import { THREE, Raf, setScene } from "../experience.js";

let scene = null;
let mesh  = null;

const loader = new THREE.TextureLoader();
const raf = new Raf((delta) => { mesh.rotation.y += delta; });

export const myPage = {
  // called in hooks.beforeInsert — loader tracks these promises
  preload() {
    return [loader.loadAsync('/texture.jpg')];
  },

  // called in hooks.mount — textures already in browser cache, loader.load() is sync
  init() {
    scene = new THREE.Scene();
    const texture = loader.load('/texture.jpg');
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    scene.add(mesh);
    setScene(scene);
  },

  on()  { raf.run(); },
  off() { raf.stop(); },

  destroy() {
    scene.remove(mesh);
    mesh.material.map?.dispose();
    mesh.material.dispose();
    mesh.geometry.dispose();
    mesh  = null;
    scene = null;
  },
};
```

Register in `entry-client.js`:

```js
import { myPage } from "./assets/pages/my-page.js";
const pageModules = { '/my-page': myPage };
```

**Texture preloading** — `preload()` returns an array of promises. `entry-client.js` passes them to `trackPromise` in `hooks.beforeInsert`, so the loader counter includes texture downloads. By the time `init()` runs, images are cached and `loader.load()` resolves synchronously.

**Dispose checklist** — call in `destroy()`:
- `geometry.dispose()`
- `material.dispose()`
- `material.map?.dispose()` (and any other texture uniforms)
- `scene.remove(mesh)` then set references to `null`

The renderer and camera are never disposed — they persist for the lifetime of the app.

## Grid overlay

`grid.js` injects a fixed 12-column overlay into the DOM. Toggle visibility with `Shift+G`. Columns are red at 10% opacity.
