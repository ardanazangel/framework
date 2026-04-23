import home from "./pages/home.html?raw";
import uiCard from "./pages/ui-card.html?raw";
import about from "./pages/about.html?raw";
import contact from "./pages/contact.html?raw";
import morphing from "./pages/morphing.html?raw";
import slider from "./pages/slider.html?raw";

import layout from "./layout.html?raw";

import { splitText } from "./core/split-engine/text-split.js";
import { projects } from "./data/projects.js";

const projectPage = (p) => /*html*/ `
  <section>
    <h1 class="chars">${p.title}</h1>
    <p>${p.year}</p>
    </section>
      ${p.imgs.map((src) => `<section><img src="${src}" loading="lazy" width="2400" height="1600"></section>`).join("\n  ")}
    <section>
    <video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" loading="lazy" width="1920" height="1080" loop muted playsinline controls></video>
    <a href="/">← Back</a>
  </section>
`;

const routeConfig = {
  "/": { html: home, title: "Home", type: "home" },
  "/about": { html: about, title: "About", type: "about" },
  "/contact": { html: contact, title: "Contact", type: "contact" },
  "/morphing": { html: morphing, title: "Morphing", type: "morphing" },
  "/slider": { html: slider, title: "Slider", type: "slider" },
  "/ui-card": { html: uiCard, title: "UI Card", type: "ui-card" },
  ...Object.fromEntries(
    projects.map(p => [`/${p.slug}`, {
      html: projectPage(p),
      title: p.title,
      type: "project",
    }])
  ),
};

const processedRoutes = Object.fromEntries(
  Object.entries(routeConfig).map(([url, { html, title }]) => [
    url,
    {
      body: splitText(html),
      title,
    },
  ]),
);

// Mapa path → tipo semántico, generado una vez al arrancar el server
export const routes = Object.fromEntries(
  Object.entries(routeConfig).map(([path, { type }]) => [path, type])
);

const page404 = {
  body: '<section><h1>404</h1><p>Page not found</p><a href="/">← Home</a></section>',
  title: '404',
}

export function render(url) {
  return processedRoutes[url] ?? page404
}

export { layout };

export function renderAll() {
  return Object.fromEntries(
    Object.keys(processedRoutes).map((url) => [url, render(url)]),
  );
}
