# Framework

Minimal SSR/SPA hybrid built on Vite + Hono. One Node.js server for dev and prod, JSON render endpoint, SPA router with CSS transitions, and a set of self-contained engines (scroll, slider, accordion, form, text split, Three.js).

## Stack

| | |
|---|---|
| Dev server | Node.js HTTP + Vite middleware (HMR) |
| Prod server | Node.js HTTP + Hono + gzip compression |
| Renderer | `entry-server.js` → JSON (`?render`) — body + full page cache + route types |
| Router | SPA client router, LRU page cache (50 slots + pinned), CSS transitions |
| Scroll | Smooth scroll desktop / native mobile. Frame-rate independent `damp` |
| Slider | `Slider` class — infinite/finite, snap, drag, wheel, touch, parallax values |
| Accordion | `Accordion` class — animated height with `damp`, exclusive or multi-open |
| Forms | Schema-driven: server renders fields, client validates + submits |
| Text | `splitText` server-side (words/chars), `lines.js` client-side via `@chenglou/pretext` |
| 3D | Three.js WebGPU renderer, fixed full-screen canvas |
| Media | Lazy load fade-in for `img` and `video` |
| Sound | Web Audio API click sounds (opt-in) |
| Dev tools | 12-col grid overlay `Shift+G`, crosshair `Shift+X` |

## Commands

```
pnpm dev              # dev server (Node + Vite HMR)
pnpm build            # build client bundle
pnpm build:server     # build SSR bundle
pnpm preview          # SSR production mode
pnpm preview:static   # prerender all routes then serve static
pnpm prerender        # build:server + prerender to JSON
```

## Structure

```
src/
  config.js              # PREFETCH_TYPES, pageModules map
  entry-client.js        # client bootstrap
  entry-server.js        # SSR renderer — render(url), renderAll(), routes, layout
  layout.html            # shared layout (nav, etc.)
  style.css              # global styles
  data/
    projects.js          # project data (slug, title, year, imgs)
  pages/
    home.html / home.js
    about.html / about.js
    contact.html
    morphing.html / morphing.js
    slider.html / slider.js
  core/
    app.js               # global state, win object, hooks
    boot.js              # initial fetch, DOM setup, asset tracking
    router.js            # SPA router, PageCache (LRU)
    loader.js            # asset load tracker, progress counter
    scroll-engine/
      index.js           # scroll engine (numbers only)
      scroll.js          # sections, RAF loop, keyboard, events
    slider-engine/
      index.js           # Slider class
    accordion-engine/
      index.js           # Accordion class
    form-engine/
      schemas.js         # field schemas
      render.js          # server-side HTML rendering
      validate.js        # shared validation (client + server)
      hydrate.js         # client-side submit + inline errors
    split-engine/
      text-split.js      # server-side words/chars splitting
      lines-split.js     # client-side line splitting
    three-engine/
      index.js           # renderer, scene, camera, RAF
    utils/
      app.js             # state, win
      detect.js          # isMobile, isSafari, isChromium, isFirefox
      math.js            # damp, lerp, clamp, symmetricMod, LAMBDA
      raf.js             # global RAF loop, Raf class
      media.js           # lazy load observer
      grid.js            # grid overlay + crosshair (dev only)
      sound.js           # Web Audio click sounds
server.js                # Hono server (dev + prod)
vite.config.js
```

## Global state

`src/core/app.js` exports `state` and `hooks`.

```js
import { state, hooks } from './core/app.js'

state.scroll       // current smooth-scroll position (px)
state.win          // { w, h, hw, wh, semi, dpr, isLandscape, isMobile }
state.route        // { current: path, previous: path }
state.is           // { home: bool, about: bool, ... } — active route type flags
state.was          // { home: bool, about: bool, ... } — previous route type flags
```

`state.win` updates on every resize and dispatches `win:resize`.

`state.is` / `state.was` are keyed by the route type strings defined in `entry-server.js` (`routeConfig`) and tracked automatically by the router.

## Lifecycle hooks

```js
hooks.beforeInsert = ({ path, el }) => { /* el is the new .page div, not yet in DOM */ }
hooks.mount        = ({ path }) => { /* new page is visible */ }
hooks.destroy      = ({ path }) => { /* old page about to be removed */ }
```

All three are set once in `entry-client.js`. Page modules plug into them via `pageModules` in `config.js`.

## Page modules

Each page has an optional JS module with this shape:

```js
export const myPage = {
  preload() { return [/* promises */] }, // tracked by loader before navigation
  init()    { /* create scene objects, instances, etc. */ },
  on()      { /* start RAF, add listeners */ },
  off()     { /* stop RAF, remove listeners */ },
  destroy() { /* dispose everything */ },
}
```

Register in `src/config.js`:

```js
export const pageModules = {
  '/':          home,
  '/my-page':   myPage,
}
```

**Call order on navigation:**
1. `preload()` — called in `hooks.beforeInsert`, promises tracked by loader
2. `hooks.destroy({ path: oldPath })` → old module's `off()` + `destroy()`
3. `hooks.mount({ path: newPath })` → new module's `init()` + `on()`

## Adding pages

1. Create `src/pages/my-page.html`
2. Register in `src/entry-server.js` inside `routeConfig`:

```js
import myPage from "./pages/my-page.html?raw";

const routeConfig = {
  "/my-page": { html: myPage, title: "My Page", type: "my-page" },
  // ...
};
```

3. (Optional) Create `src/pages/my-page.js` and add to `src/config.js`:

```js
export const pageModules = {
  '/my-page': myPage,
}
```

4. (Optional) Add to `PREFETCH_TYPES` in `config.js` to prefetch it at boot:

```js
export const PREFETCH_TYPES = new Set(['home', 'about', 'my-page'])
```

## Router

`initRouter(preloaded, { routes })` called once in `entry-client.js`. Intercepts all same-origin `<a href>` clicks. Handles `popstate` for browser history.

**Page cache** — `PageCache` is an LRU cache capped at 50 slots. Routes loaded at boot are pinned (never evicted). The full page cache for all routes is sent in the first `?render` response and populated at startup.

**Transition:**
- Old page: `page-out` animation (dim + scale down + slide up, `z-index: 0`)
- New page: `page-in` animation (clip-path wipe from bottom, `z-index: 10`, `position: fixed`)
- After `animationend`: old page removed, new page class cleaned up

**Timeout:** 15s safety valve forces `loader:complete` if assets never settle.

**Mobile:** `detect.isMobile` skips importing the scroll engine entirely — native scroll is used.

## Loader

Tracks image and video loading per navigation. Shows a numeric counter in `#loader`.

```
loader:start → pool resets → assets tracked → ready() called → 100% → loader:complete
```

```js
import { track, trackPromise, ready } from './core/loader.js'

track(['url1.jpg', 'url2.jpg'])          // images
track(['video.mp4'], 'video')            // videos (tracks loadedmetadata)
trackPromise(fetch('/data.json'))        // any promise
ready()                                  // signal that all assets have been queued
```

`trackPromise` is used for Three.js texture preloads, GLTF loads, etc. Accepts multiple promises in one call.

## Lifecycle events

All events dispatched on `window` as `CustomEvent`.

| Event | Detail | When |
|---|---|---|
| `loader:start` | — | navigation begins |
| `loader:complete` | — | all assets loaded + 200ms |
| `scroll:tick` | `{ scroll, velocity, direction }` | every frame while scrolling (desktop) |
| `scroll:lock` | — | during page transitions |
| `scroll:unlock` | — | after transition ends |
| `scroll:reset` | — | reset scroll to top immediately |
| `route:save` | `{ path }` | before navigation starts — save scroll state |
| `transition:end` | — | page-out animation finished |
| `win:resize` | `{ w, h, hw, wh, semi, dpr, isLandscape, isMobile }` | window resize |

```js
window.addEventListener('scroll:tick', ({ detail: { scroll, velocity, direction } }) => { ... })
window.addEventListener('loader:complete', () => { ... })
window.addEventListener('win:resize', ({ detail: win }) => { ... })
```

## Scroll engine

Desktop-only smooth scroll using frame-rate independent `damp`. Mobile uses native scroll.

**Engine** (`src/core/scroll-engine/index.js`) — pure numbers, no DOM:

```js
import { engine } from './core/scroll-engine/index.js'

engine.cur          // rendered position (px)
engine.tar          // target position (px)
engine.locked       // bool

engine.scrollTo(y)                  // smooth scroll to y
engine.scrollTo(y, { immediate: true }) // instant jump
engine.setMax(totalHeight)          // called automatically by sections
engine.loop(delta)                  // called by RAF — returns { cur, tar, velocity, moving }
```

**Sections** (`src/core/scroll-engine/scroll.js`) — manages DOM sections:

```js
import { scroll, initScroll } from './core/scroll-engine/scroll.js'

initScroll()              // call once after boot, sets body overflow:hidden
scroll.on()               // enable keyboard shortcuts (arrows, space)
scroll.off()              // disable keyboard shortcuts
scroll.scrollTo(y)        // proxy to engine.scrollTo
scroll.engine             // direct engine access
scroll.sections           // direct sections access
```

`sections.auto()` auto-registers all `<section>` elements. `sections.register(els)` for manual control. Sections stay in normal document flow — only `transform: translate3d` is applied.

On `transition:end` the sections are cleared and re-registered automatically.

## Slider engine

```js
import { Slider } from './core/slider-engine/index.js'

const slider = new Slider(wrapperEl, {
  infinite:         true,      // loop around
  snap:             true,      // snap to nearest slide on drag end
  lerpFactor:       1/6,       // matches scroll engine LAMBDA
  snapStrength:     0.08,      // pull toward snap per frame
  speedDecay:       0.85,
  dragSensitivity:  1,
  wheelSensitivity: 0.003,
  onSlideChange:    (current, previous) => {},
  onUpdate:         (slider) => {},
})

slider.init()           // start
slider.destroy()        // remove all event listeners, disconnect observers

slider.goToNext()
slider.goToPrev()
slider.goToIndex(n)

slider.currentSlide     // index of active slide
slider.current          // interpolated position
slider.target           // target position
slider.progress         // 0–1
slider.parallaxValues   // array — one value per slide

// must be called each frame
slider.update()
```

`parallaxValues` in **infinite mode**: position in slide units relative to center (0 = centered, ±1 = one slide away).  
`parallaxValues` in **finite mode**: pixel offset from left edge of the wrapper for each slide.

Uses `IntersectionObserver` (skips update when off-screen) and `ResizeObserver` (auto-remeasures on resize).

## Accordion engine

```js
import { Accordion } from './core/accordion-engine/index.js'

const accordion = new Accordion(wrapperEl, {
  exclusive:   true,     // only one item open at a time
  lerpFactor:  1/6,
  activeIndex: 0,        // open by default (no animation)
  onOpen:      (index) => {},
  onClose:     (index) => {},
  onUpdate:    (accordion) => {},
})

accordion.init()        // start RAF, measure heights
accordion.destroy()     // stop RAF, reset DOM, remove listeners

accordion.open(index)
accordion.close(index)
accordion.toggle(index)
accordion.closeAll()
accordion.openIndices   // array of open indices

accordion.resize()      // re-measure (called automatically via ResizeObserver)
```

**Expected HTML:**

```html
<div class="accordion">
  <div class="accordion-item">
    <button class="accordion-trigger">Title</button>
    <div class="accordion-panel">Content</div>
  </div>
</div>
```

Active item gets class `accordion-item--open`. Height animates with `damp` to the panel's `scrollHeight`.

## Form engine

Schemas defined in `src/core/form-engine/schemas.js`. Each schema maps to:
- A `POST /api/:name` endpoint (auto-registered in `server.js`)
- A `<form data-form="name">` in any page template

**Adding a form:**

1. Add schema to `schemas.js`:

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
}
```

2. Place `<form data-form="contact"></form>` in a page HTML — fields are injected server-side.

**Field types:** `text`, `email`, `password`, `tel`, `textarea`, `select`, `checkbox`

**Validation rules:** `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `match` (must equal another field's value)

Validation runs on both client and server from the same `validate()` function. Client shows inline errors per field, cleared on input. Server returns `400 + { errors }` or `200 + { ok: true }`.

**Form events:**

| Event | Detail |
|---|---|
| `form:submit` | `{ action, body }` |
| `form:success` | `{ action }` |
| `form:error` | `{ action, error }` |

**Handling submissions** — add logic after the `console.log` in `server.js`:

```js
app.post('/api/:name', async (c) => {
  // ... validation runs automatically ...
  console.log(`[form:${name}]`, body)
  // TODO: send email, save to DB, etc.
  return c.json({ ok: true })
})
```

## Text splitting

**Server-side** (`splitText`) — pure string transform, runs in `entry-server.js`:
- `class="words"` → wraps each word: `<span class="word"><span class="word-inner">…</span></span>`
- `class="chars"` → wraps each char: `<span class="char"><span class="char-inner">…</span></span>`

Handles inline tags (`<a>`, `<em>`, `<strong>`, etc.) without breaking them. Safe for SSR — no DOM required.

**Client-side** (`lines.js`) — uses `@chenglou/pretext` to measure real line breaks against computed font metrics:
- `class="lines"` → each line: `<span class="line"><span class="line-inner">…</span></span>`
- Runs automatically via `lines.on()` on every mount
- Waits for `document.fonts.ready` on first load
- Re-runs on `transition:end`

## Three.js / WebGPU

One `WebGPURenderer`, one `PerspectiveCamera`, one global `Scene`. Fixed full-screen canvas (`position: fixed; z-index: 1`).

```js
import { THREE, Raf, scene, camera, renderer, initExperience } from './core/three-engine/index.js'

await initExperience()   // creates canvas, init WebGPU renderer, starts RAF
```

**Page module pattern:**

```js
import { THREE, Raf, scene, camera, renderer } from '../core/three-engine/index.js'

let mesh = null
const raf = new Raf((delta) => { mesh.rotation.y += delta })

export const myPage = {
  preload() {
    const loader = new THREE.TextureLoader()
    return [loader.loadAsync('/texture.jpg')]
  },

  init() {
    const loader = new THREE.TextureLoader()
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ map: loader.load('/texture.jpg') }),
    )
    scene.add(mesh)
  },

  on()  { raf.run() },
  off() { raf.stop() },

  destroy() {
    scene.remove(mesh)
    mesh.material.map?.dispose()
    mesh.material.dispose()
    mesh.geometry.dispose()
    mesh = null
  },
}
```

**Dispose checklist:**
- `geometry.dispose()`
- `material.dispose()`
- `material.map?.dispose()` (and any other texture uniforms)
- `scene.remove(mesh)` then null the references

The renderer and camera persist for the lifetime of the app — never dispose them.

## Utils

### `raf.js`

Global RAF loop. All subscribers share one `requestAnimationFrame`.

```js
import { Raf } from './core/utils/raf.js'

const raf = new Raf((delta, time) => { /* delta in seconds */ })
raf.run()
raf.stop()
```

### `math.js`

```js
import { damp, lerp, clamp, symmetricMod, LAMBDA } from './core/utils/math.js'

LAMBDA           // 6 — shared lerp factor for scroll + slider + accordion
damp(a, b, lambda, dt)   // frame-rate independent smooth interpolation
lerp(a, b, t)
clamp(v, min, max)
symmetricMod(value, base) // shortest offset within [-base/2, base/2) — for infinite slider
```

### `detect.js`

```js
import { detect } from './core/utils/detect.js'

detect.isMobile    // bool
detect.isSafari    // bool
detect.isChromium  // bool
detect.isFirefox   // bool
```

### `media.js`

Adds class `loaded` to `img[loading='lazy']` and `video[loading='lazy']` once they finish loading. Uses `IntersectionObserver` — only triggers when the element enters the viewport.

```js
import { media } from './core/utils/media.js'
media.on()    // called automatically on every mount
media.off()   // disconnects observer
```

### `sound.js`

Web Audio API click sounds. Off by default. Import and call `sound.on()` to enable.

```js
import { sound } from './core/sound.js'
sound.on()    // attach click handler
sound.off()   // detach
```

## Dev tools

`grid.js` is imported in dev mode only (`import.meta.env.DEV`).

| Shortcut | Action |
|---|---|
| `Shift+G` | Toggle 12-column grid overlay (red, 10% opacity) |
| `Shift+X` | Toggle center crosshair (horizontal + vertical lines) |
