import "./style.css";
import { initRouter } from "./assets/router.ts";
import { hooks, state } from "./assets/app.js";
import { track, ready } from "./assets/loader.js";
import { boot } from "./assets/boot.js";
import { media } from "./assets/media.js";
import { sound } from "./assets/sound.js";
import { lines } from "./assets/lines.js";
import { form } from "./assets/form.js";
import { home } from "./assets/pages/home.js";
import { snif } from "./assets/snif.js";

import "./assets/grid.js";

const modules = [media, sound, lines, form];

if (!snif.isMobile) {
  const { scroll } = await import("./assets/scroll.js");
  scroll.on(); // scroll siempre activo, no se apaga en transiciones
}

const { page, cache } = await boot();

const prefetched = new Set(
  Object.entries(cache).filter(([, { prefetch }]) => prefetch).map(([path]) => path)
);

initRouter({
  [location.pathname]: { body: page.body, title: page.title },
  ...cache,
});

const pageModules = { '/': home};

hooks.beforeInsert = ({ path, el }) => {
  if (prefetched.has(path)) { ready(); return; }
  track([...el.querySelectorAll("img[src]")].map((img) => img.getAttribute("src")));
  track([...el.querySelectorAll("video[src]")].map((v) => v.getAttribute("src")), "video");
  ready();
};

hooks.destroy = ({ path }) => {
  state.route.previous = path;
  modules.forEach(m => m.off());
  pageModules[path]?.off();
};

hooks.mount = ({ path }) => {
  state.route.current = path;
  modules.forEach(m => m.on());
  const pm = pageModules[path];
  if (pm) { pm.init(); pm.on(); }
};

// primer mount — funciona con o sin router
requestAnimationFrame(() => hooks.mount?.({ path: location.pathname }))
