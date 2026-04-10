type PageData = { body: string; title: string };
type PageCache = Record<string, PageData>;

const style = document.createElement("style");
style.textContent = /* css */`
  @keyframes page-out { to   { filter: brightness(0.2); scale: 0.9; transform: translateY(-25%) } }
  @keyframes page-in  { from { clip-path: polygon(0% 100vh, 100% 100vh, 100% 100vh, 0% 100vh); } }
  .page     { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
  .page-out { animation: page-out 1.2s forwards var(--io4); }
  .page-in  { animation: page-in  1.2s forwards var(--io4); z-index: 1; position: fixed; top:0; left: 0; width: 100%;}
`;
document.head.appendChild(style);

import { emit as dispatch } from "./lifecycle.js";

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
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  const readChunk = async (): Promise<PageData> => {
    const { value, done } = await reader.read();
    buf += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const nl = buf.indexOf("\n");
    if (nl === -1 && !done) return readChunk();
    const line = buf.slice(0, nl === -1 ? buf.length : nl);
    buf = nl === -1 ? "" : buf.slice(nl + 1);
    const page: PageData = JSON.parse(line);
    pages[path] = page;
    // read cache in background
    if (!done) readRemaining();
    return page;
  };

  const readRemaining = async () => {
    const { value, done } = await reader.read();
    buf += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const nl = buf.indexOf("\n");
    if (nl === -1 && !done) return readRemaining();
    const line = buf.slice(0, nl === -1 ? buf.length : nl);
    if (line) {
      const { cache }: { cache: PageCache } = JSON.parse(line);
      Object.assign(pages, cache);
    }
  };

  return readChunk();
}

let navigating = false;

async function navigate(path: string, push = true) {
  if (navigating) return;
  navigating = true;
  dispatch("loader:start", null);

  // Timeout de 15 segundos máximo para evitar que el loader se quede visible
  const loaderTimeout = setTimeout(() => {
    console.warn(`Navigation timeout for path: ${path}`);
    dispatch("loader:complete", null);
  }, 15000);

  let page: PageData;
  try { 
    page = await fetchPage(path); 
  }
  catch (err) { 
    console.error("Navigation failed:", err);
    clearTimeout(loaderTimeout);
    dispatch("loader:complete", null);
    navigating = false;
    return; 
  }

  document.title = page.title;
  const newPage = document.createElement("div");
  newPage.className = "page page-in";
  newPage.innerHTML = page.body;
  const loaderDone = waitForLoader();
  dispatch("page:before-insert", { path, el: newPage });

  await loaderDone;
  clearTimeout(loaderTimeout);

  const oldPath = location.pathname;
  const oldPage = getPage();
  Object.assign(oldPage.style, {
    position: "fixed",
    top: `-${scrollY}px`,
    left: "0",
    right: "0",
    width: "100%",
  });
  oldPage.classList.add("page-out");

  document.querySelector("#_root")!.appendChild(newPage);
  if (push) history.pushState({}, "", path);
  scrollTo(0, 0);

  await waitForAnimation(oldPage);
  dispatch("page:destroy", { path: oldPath });
  oldPage.remove();
  newPage.classList.remove("page-in");
  dispatch("page:mount", { path: location.pathname });
  dispatch("loader:complete", null);
  navigating = false;
}

export function addToCache(data: PageCache) {
  Object.assign(pages, data);
}

export function initRouter(preloaded: PageCache = {}) {
  pages = preloaded;
  wrapInPage();
  setTimeout(() => dispatch("page:mount", { path: location.pathname }));

  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!a || a.origin !== location.origin || a.target) return;
    e.preventDefault();
    if (a.pathname === location.pathname) return;
    navigate(a.pathname);
  });

  window.addEventListener("popstate", () => navigate(location.pathname, false));
}