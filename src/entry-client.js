import "./style.css";
import { initRouter } from "./assets/router.ts";
import { hooks, state } from "./assets/app.js";
import { track, trackPromise, ready } from "./assets/loader.js";
import { boot } from "./assets/boot.js";
import { media } from "./assets/media.js";
import { lines } from "./assets/lines.js";
import { form } from "./assets/form.js";
import { home } from "./assets/pages/home.js";
import { about } from "./assets/pages/about.js";
import { detect } from "./assets/detect.js";

import "./assets/grid.js";
import { initExperience } from "./assets/experience.js";

await initExperience();

const modules = [media, lines, form];

if (!detect.isMobile) {
  const { scroll } = await import("./assets/scroll.js");
  scroll.on(); // scroll siempre activo, no se apaga en transiciones
}

const pageModules = { '/': home, '/about': about };

const { page, cache } = await boot({ preload: pageModules[location.pathname]?.preload });

const prefetched = new Set(
  Object.entries(cache).filter(([, { prefetch }]) => prefetch).map(([path]) => path)
);

initRouter({
  [location.pathname]: { body: page.body, title: page.title },
  ...cache,
});

hooks.beforeInsert = ({ path, el }) => {
  if (prefetched.has(path)) { ready(); return; }
  track([...el.querySelectorAll("img[src]")].map((img) => img.getAttribute("src")));
  track([...el.querySelectorAll("video[src]")].map((v) => v.getAttribute("src")), "video");
  const pm = pageModules[path];
  if (pm?.preload) trackPromise(...pm.preload());
  ready();
};

hooks.destroy = ({ path }) => {
  state.route.previous = path;
  modules.forEach(m => m.off());
  const pm = pageModules[path];
  pm?.off();
  pm?.destroy?.();
};

hooks.mount = ({ path }) => {
  state.route.current = path;
  modules.forEach(m => m.on());
  const pm = pageModules[path];
  if (pm) { pm.init(); pm.on(); }
};

// primer mount — funciona con o sin router
requestAnimationFrame(() => hooks.mount?.({ path: location.pathname }))
