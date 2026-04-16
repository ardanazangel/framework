const style = document.createElement("style");
style.textContent = /* css */`
  @keyframes page-out { to   { filter: brightness(0.2); scale: 0.9; transform: translateY(-10%) } }
  @keyframes page-in  { from { clip-path: polygon(0% 100vh, 100% 100vh, 100% 100vh, 0% 100vh); } }
  .page     { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
  .page-out { animation: page-out 1.2s forwards var(--io4); z-index: 0; transition: none;}
  .page-in  { animation: page-in  1.2s forwards var(--io4); z-index: 10; position: fixed; top: 0; left: 0; width: 100%; height: 100vh; overflow: hidden; }
`;
document.head.appendChild(style);

import { hooks, state } from "./app.js";

// ─── LRU cache con pin ──────────────────────────────────────────────────────

const MAX_CACHED = 50

class PageCache {
  #map = new Map()   // path → data  (Map insertion order = LRU)
  #pinned = new Set() // rutas que nunca se evictan (boot preload)

  has(path) { return this.#map.has(path) }

  get(path) {
    const val = this.#map.get(path)
    if (val === undefined) return undefined
    // mover al final = más reciente
    this.#map.delete(path)
    this.#map.set(path, val)
    return val
  }

  set(path, data) {
    if (this.#map.has(path)) this.#map.delete(path)
    this.#map.set(path, data)
    this.#evict()
  }

  pin(path, data) {
    this.#pinned.add(path)
    this.set(path, data)
  }

  assign(obj, pinAll = false) {
    for (const [k, v] of Object.entries(obj)) {
      pinAll ? this.pin(k, v) : this.set(k, v)
    }
  }

  #evict() {
    while (this.#map.size > MAX_CACHED + this.#pinned.size) {
      for (const key of this.#map.keys()) {
        if (!this.#pinned.has(key)) {
          this.#map.delete(key)
          break
        }
      }
    }
  }
}

const getPage = () => document.querySelector(".page");

const waitForAnimation = (el) =>
  new Promise((res) =>
    el.addEventListener("animationend", () => res(), { once: true })
  );

const waitForLoader = () =>
  new Promise((res) =>
    window.addEventListener("loader:complete", () => res(), { once: true })
  );

function wrapInPage() {
  const root = document.querySelector("#_root");
  const page = document.createElement("div");
  page.className = "page";
  page.append(...root.childNodes);
  root.appendChild(page);
}

const pages = new PageCache();

async function fetchPage(path) {
  const cached = pages.get(path);
  if (cached) return cached;

  const data = await fetch(path + "?render").then(r => r.json());

  if (data.title === "404") {
    location.replace("/404");
    return new Promise(() => {});
  }

  pages.set(path, data);
  pages.assign(data.cache ?? {});

  return data;
}

// Fix 3: ignorar popstate si el documento no terminó de cargar
// (e.g. restauración de sesión del browser antes de DOMContentLoaded)
let domReady = document.readyState === 'complete'
if (!domReady) {
  window.addEventListener('load', () => {
    setTimeout(() => { domReady = true }, 0)
  }, { once: true })
}

// path → nombre de tipo semántico ("home", "about", ...)
const routeTypes = {}


let navigating = false;

async function navigate(path, push = true) {
  if (navigating) return;
  navigating = true;

  // Fix 2: snapshot de UI antes de que empiece cualquier cambio
  // El scroll engine y cualquier página escuchan "route:save" para guardar su estado
  window.dispatchEvent(new CustomEvent('route:save', {
    detail: { path: location.pathname }
  }))

  // Fix 1: actualizar flags is/was
  const prevType = routeTypes[location.pathname]
  const nextType = routeTypes[path]
  // Limpiar todos los was — solo uno puede ser true a la vez
  for (const type of Object.values(routeTypes)) state.was[type] = false
  if (prevType) {
    state.is[prevType] = false
    state.was[prevType] = true
  }
  if (nextType) state.is[nextType] = true

  window.dispatchEvent(new CustomEvent("loader:start"));

  const loaderTimeout = setTimeout(() => {
    console.warn(`Navigation timeout for path: ${path}`);
    window.dispatchEvent(new CustomEvent("loader:complete"));
  }, 15000);

  let page;

  try {
    page = await fetchPage(path);
  } catch (err) {
    console.error("Navigation failed:", err);
    clearTimeout(loaderTimeout);
    window.dispatchEvent(new CustomEvent("loader:complete"));
    navigating = false;
    return;
  }

  document.title = page.title;

  const newPage = document.createElement("div");
  newPage.className = "page page-in";
  newPage.innerHTML = page.body;

  const loaderDone = waitForLoader();

  if (hooks.beforeInsert) {
    hooks.beforeInsert({ path, el: newPage });
  }

  await loaderDone;
  clearTimeout(loaderTimeout);

  const oldPath = location.pathname;
  const oldPage = getPage();

  window.dispatchEvent(new CustomEvent("scroll:lock"));

  Object.assign(oldPage.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    overflow: "hidden",
    zIndex: "0",
  });

  oldPage.classList.add("page-out");

  window.dispatchEvent(new CustomEvent("scroll:reset"));

  document.querySelector("#_root").appendChild(newPage);

  if (push) history.pushState({}, "", path);

  if (hooks.destroy) {
    hooks.destroy({ path: oldPath });
  }

  if (hooks.mount) {
    hooks.mount({ path: location.pathname });
  }

  window.dispatchEvent(new CustomEvent("loader:complete"));

  await waitForAnimation(oldPage);

  oldPage.remove();
  newPage.classList.remove("page-in");

  window.dispatchEvent(new CustomEvent("transition:end"));
  window.dispatchEvent(new CustomEvent("scroll:unlock"));

  navigating = false;
}

export function addToCache(data) {
  pages.assign(data);
}

export function initRouter(preloaded = {}, { routes = {} } = {}) {
  // routes viene del server: { "/": "home", "/about": "about", ... }
  for (const [path, type] of Object.entries(routes)) {
    routeTypes[path] = type
    state.is[type] = false
    state.was[type] = false
  }
  // Marcar la página actual como activa
  const currentType = routeTypes[location.pathname]
  if (currentType) state.is[currentType] = true

  pages.assign(preloaded, true);
  wrapInPage();

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.origin !== location.origin || a.target) return;

    e.preventDefault();

    if (a.pathname === location.pathname) return;

    navigate(a.pathname);
  });

  // Fix 3: ignorar popstate durante carga inicial
  window.addEventListener("popstate", () => {
    if (!domReady) return
    navigate(location.pathname, false)
  });
}