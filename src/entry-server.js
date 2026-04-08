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
  <a href="/">← Back</a>
</div>`;

const routes = {
  "/": { html: home, title: "Home" },
  "/about": { html: about, title: "About" },
};

const processedRoutes = Object.fromEntries(
  Object.entries(routes).map(([url, { html, title }]) => [
    url,
    { body: splitText(html), title },
  ]),
);

for (const p of projects) {
  processedRoutes[`/${p.slug}`] = {
    body: splitText(projectPage(p)),
    title: p.title,
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
