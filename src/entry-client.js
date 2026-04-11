import "./style.css";

import { initRouter } from "./assets/router.ts";
import { hooks } from "./assets/lifecycle.js";
import { track, ready } from "./assets/loader.js";
import { boot } from "./assets/boot.js";
import { state } from "./assets/state.js";
import { snif } from "./assets/snif.js";
import { media } from "./assets/media.js";
import { sound } from "./assets/sound.js";
import { lines } from "./assets/lines.js";
import { form } from "./assets/form.js";
import { about } from "./assets/pages/about.js";

import "./assets/grid.js";

const modules = [media, sound, lines, form];

if (!snif.isMobile) {
  const { scroll } = await import("./assets/scroll.js");
  modules.push(scroll);
}

const { page, cache } = await boot();

const prefetched = new Set(
  Object.entries(cache).filter(([, { prefetch }]) => prefetch).map(([path]) => path)
);

initRouter({
  [location.pathname]: { body: page.body, title: page.title },
  ...cache,
});

const pageModules = { '/about': about };

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

// init state + modules on first load
state.route.current = location.pathname;
modules.forEach(m => m.on());
