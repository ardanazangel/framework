import home from "./pages/home.html?raw";
import about from "./pages/about.html?raw";
import contact from "./pages/contact.html?raw";
import morphing from "./pages/morphing.html?raw";
import slider from "./pages/slider.html?raw";


import layout from "./layout.html?raw";

import { splitText } from "./assets/text-split.js";
import { projects } from "./data/projects.js";
import { renderForm, schemas, validate } from "./assets/form.js";
export { schemas, validate };

function injectForms(html) {
  return html.replace(
    /(<form[^>]*\sdata-form="([^"]+)"[^>]*>)[\s\S]*?(<\/form>)/g,
    (_, open, name, close) => {
      const schema = schemas[name];
      if (!schema) {
        console.warn(`[form] no schema found for "${name}"`);
        return _;
      }
      return `${open}\n${renderForm(schema)}\n${close}`;
    },
  );
}

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

const routes = {
  "/": { html: home, title: "Home", prefetch: true },
  "/about": { html: about, title: "About", prefetch: true },
  "/contact": { html: contact, title: "Contact" },
  "/morphing": { html: morphing, title: "Morphing" },
  "/slider": { html: slider, title: "Slider" },
};

const processedRoutes = Object.fromEntries(
  Object.entries(routes).map(([url, { html, title, prefetch }]) => [
    url,
    {
      body: splitText(injectForms(html)),
      title,
      ...(prefetch && { prefetch }),
    },
  ]),
);

for (const p of projects) {
  processedRoutes[`/${p.slug}`] = {
    body: splitText(projectPage(p)),
    title: p.title,
    prefetch: true,
  };
}

export function render(url) {
  return (
    processedRoutes[url]
  );
}

export { layout };

export function renderAll() {
  return Object.fromEntries(
    Object.keys(processedRoutes).map((url) => [url, render(url)]),
  );
}
