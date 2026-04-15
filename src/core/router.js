const style = document.createElement("style");
style.textContent = `
  @keyframes page-out { to   { filter: brightness(0.2); scale: 0.9; transform: translateY(-10%) } }
  @keyframes page-in  { from { clip-path: polygon(0% 100vh, 100% 100vh, 100% 100vh, 0% 100vh); } }
  .page     { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
  .page-out { animation: page-out 1.2s forwards var(--io4); z-index: 0; transition: none;}
  .page-in  { animation: page-in  1.2s forwards var(--io4); z-index: 10; position: fixed; top: 0; left: 0; width: 100%; height: 100vh; overflow: hidden; }
`;
document.head.appendChild(style);

import { hooks } from "./app.js";
import { streamLines } from "./boot.js";

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

  const res = await fetch(path + "?render");
  const read = streamLines(res);

  // line 1: page data
  const { line, read: next } = await read();
  const page = JSON.parse(line);

  if (page.title === "404") {
    location.replace("/404");
    return new Promise(() => {}); // nunca resuelve
  }

  pages.set(path, page);

  // line 2: cache en background
  next().then(({ line }) => {
    if (!line) return;
    const { cache } = JSON.parse(line);
    pages.assign(cache);
  });

  return page;
}

let navigating = false;

async function navigate(path, push = true) {
  if (navigating) return;
  navigating = true;

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

export function initRouter(preloaded = {}) {
  pages.assign(preloaded, true);
  wrapInPage();

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.origin !== location.origin || a.target) return;

    e.preventDefault();

    if (a.pathname === location.pathname) return;

    navigate(a.pathname);
  });

  window.addEventListener("popstate", () =>
    navigate(location.pathname, false)
  );
}