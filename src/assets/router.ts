type PageData = { body: string; title: string };
type PageCache = Record<string, PageData>;

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
import { streamLines } from "./boot.js";

const getPage = () => document.querySelector<HTMLElement>(".page")!;

const waitForAnimation = (el: Element) =>
  new Promise<void>((res) => el.addEventListener("animationend", () => res(), { once: true }));

const waitForLoader = () =>
  new Promise<void>(res => window.addEventListener("loader:complete", () => res(), { once: true }));

function wrapInPage() {
  const root = document.querySelector("#_root")!;
  const page = document.createElement("div");
  page.className = "page";
  page.append(...root.childNodes);
  root.appendChild(page);
}

let pages: PageCache = {};

async function fetchPage(path: string): Promise<PageData> {
  if (pages[path]) return pages[path];
  const res = await fetch(path + "?render");
  const read = streamLines(res);

  // line 1: page data
  const { line, read: next } = await read();
  const page: PageData = JSON.parse(line);

  if (page.title === "404") {
    location.replace("/404");
    return new Promise(() => {}); // never resolves — la navegacion se cancela
  }

  pages[path] = page;

  // line 2: cache — read in background
  next().then(({ line }) => {
    if (!line) return;
    const { cache }: { cache: PageCache } = JSON.parse(line);
    Object.assign(pages, cache);
  });

  return page;
}

let navigating = false;

async function navigate(path: string, push = true) {
  if (navigating) return;
  navigating = true;
  window.dispatchEvent(new CustomEvent("loader:start"));

  // Timeout de 15 segundos máximo para evitar que el loader se quede visible
  const loaderTimeout = setTimeout(() => {
    console.warn(`Navigation timeout for path: ${path}`);
    window.dispatchEvent(new CustomEvent("loader:complete"));
  }, 15000);

  let page: PageData;
  try { 
    page = await fetchPage(path); 
  }
  catch (err) { 
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
  hooks.beforeInsert?.({ path, el: newPage });

  await loaderDone;
  clearTimeout(loaderTimeout);

  const oldPath = location.pathname;
  const oldPage = getPage();

  // guardar posición de scroll antes de resetear
  const scrollY = state.scroll;

  window.dispatchEvent(new CustomEvent("scroll:lock"));

  // congelar página vieja: top negativo para mostrar la posición de scroll actual
  document.body.appendChild(oldPage);
  Object.assign(oldPage.style, {
    position: "fixed",
    top: `${-scrollY}px`,
    left: "0",
    right: "0",
    bottom: "0",
    overflow: "hidden",
    zIndex: "0",
  });
  oldPage.classList.add("page-out");

  // nueva página siempre desde el top
  window.dispatchEvent(new CustomEvent("scroll:reset"));

  document.querySelector("#_root")!.appendChild(newPage);
  if (push) history.pushState({}, "", path);

  hooks.destroy?.({ path: oldPath });
  hooks.mount?.({ path: location.pathname });
  window.dispatchEvent(new CustomEvent("loader:complete"));

  await waitForAnimation(oldPage);
  oldPage.remove();
  newPage.classList.remove("page-in");
  window.dispatchEvent(new CustomEvent("transition:end")); // scroll.js resetea el scroll
  window.dispatchEvent(new CustomEvent("scroll:unlock"));
  navigating = false;
}

export function addToCache(data: PageCache) {
  Object.assign(pages, data);
}

export function initRouter(preloaded: PageCache = {}) {
  Object.assign(pages, preloaded);
  wrapInPage();

  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!a || a.origin !== location.origin || a.target) return;
    e.preventDefault();
    if (a.pathname === location.pathname) return;
    navigate(a.pathname);
  });

  window.addEventListener("popstate", () => navigate(location.pathname, false));
}