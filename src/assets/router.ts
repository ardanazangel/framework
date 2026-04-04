type PageData = { html: string };
type PageCache = Record<string, PageData>;

const style = document.createElement("style");
style.textContent = `
  @keyframes page-out { to { opacity: 0 } }
  @keyframes page-in  { from { opacity: 0 } }
  .page-out { animation: page-out 0.2s forwards; }
  .page-in  { animation: page-in  0.2s forwards; }
`;
document.head.appendChild(style);

const dispatch = (name: string, detail: unknown) =>
  document.dispatchEvent(new CustomEvent(name, { detail }));

const getPage = () => document.querySelector<HTMLElement>(".page")!;

const waitForAnimation = (el: Element) =>
  new Promise<void>((res) => el.addEventListener("animationend", () => res(), { once: true }));

function wrapInPage() {
  const root = document.querySelector("#_root")!;
  const page = document.createElement("div");
  page.className = "page";
  page.append(...root.childNodes);
  root.appendChild(page);
}

let pages: PageCache = {};

async function getHtml(path: string): Promise<string> {
  if (pages[path]) return pages[path].html;
  const res = await fetch("/render?path=" + encodeURIComponent(path));
  const data: { cache: PageCache } = await res.json();
  return data.cache[path]?.html ?? "";
}

let navigating = false;

async function navigate(path: string, push = true) {
  if (navigating) return;
  navigating = true;
  dispatch("loader:start", null);

  const html = await getHtml(path);

  const newPage = document.createElement("div");
  newPage.className = "page page-in";
  newPage.innerHTML = html;
  dispatch("page:before-insert", { path, el: newPage });

  const oldPath = location.pathname;
  const oldPage = getPage();
  Object.assign(oldPage.style, {
    position: "fixed",
    width: "100vw",
    height: "100vh",
    top: -scrollY + "px",
  });
  oldPage.classList.add("page-out");

  document.querySelector("#_root")!.appendChild(newPage);
  if (push) history.pushState({}, "", path);

  await waitForAnimation(oldPage);
  dispatch("page:destroy", { path: oldPath });
  oldPage.remove();
  newPage.classList.remove("page-in");
  scrollTo(0, 0);
  dispatch("page:mount", { path: location.pathname });
  dispatch("loader:done", null);
  navigating = false;
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
