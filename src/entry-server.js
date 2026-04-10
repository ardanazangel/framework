import home from "./pages/home.html?raw";
import about from "./pages/about.html?raw";
import layout from "./layout.html?raw";

import { splitText } from "./assets/text-split.js";
import { projects } from "./data/projects.js";

const projectPage = (p) => /*html*/ `
<div class="project">
  <h1 class="chars">${p.title}</h1>
  <p>${p.year}</p>
  ${p.imgs.map((src) => `<img src="${src}" width="2400" height="1600" loading="lazy">`).join("\n  ")}
  <video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" width="1920" height="1080" loop loading="lazy" muted playsinline controls></video>
  <a href="/">← Back</a>
</div>`;

const routes = {
  "/": { html: home, title: "Home", prefetch: true },
  "/about": { html: about, title: "About", prefetch: true },
};

const processedRoutes = Object.fromEntries(
  Object.entries(routes).map(([url, { html, title, prefetch }]) => [
    url,
    { body: splitText(html), title, ...(prefetch && { prefetch }) },
  ]),
);

for (const p of projects) {
  processedRoutes[`/${p.slug}`] = {
    body: splitText(projectPage(p)),
    title: p.title,
    ...(p.prefetch && { prefetch: true }),
  };
}

export function render(url) {
  return processedRoutes[url] ?? { body: "<pre>404</pre>", title: "404" };
}

export { layout };

export function renderAll() {
  return Object.fromEntries(
    Object.keys(processedRoutes).map((url) => [url, render(url)]),
  );
}
