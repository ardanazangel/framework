import "./style.css";
import { initRouter } from "./core/router.js";
import { hooks, state } from "./core/app.js";
import { track, trackPromise, ready } from "./core/loader.js";
import { boot } from "./core/boot.js";
import { media } from "./core/utils/media.js";
import { lines } from "./core/split-engine/lines-split.js";
import { PREFETCH_TYPES, pageModules } from "./config.js";

import { detect } from "./core/utils/detect.js";
if (!detect.isMobile) await import("./core/scroll-engine/scroll.js");
import { initExperience } from "./core/three-engine/index.js";

if (import.meta.env.DEV) import("./core/utils/grid.js");

await initExperience();

const modules = [media, lines];

const { page, cache, routes } = await boot({
  preload: pageModules[location.pathname]?.preload,
});
bootRouter(page, cache, routes);

function bootRouter(page, cache, routes) {
  const prefetched = new Set(
    Object.entries(routes)
      .filter(([path, type]) => PREFETCH_TYPES.has(type) && cache[path])
      .map(([path]) => path),
  );

  initRouter(
    {
      [location.pathname]: { body: page.body, title: page.title },
      ...cache,
    },
    { routes },
  );

  hooks.beforeInsert = ({ path, el }) => {
    if (prefetched.has(path)) {
      ready();
      return;
    }
    track(
      [...el.querySelectorAll("img[src]")].map((img) =>
        img.getAttribute("src"),
      ),
    );
    track(
      [...el.querySelectorAll("video[src]")].map((v) => v.getAttribute("src")),
      "video",
    );
    const pm = pageModules[path];
    if (pm?.preload) trackPromise(...pm.preload());
    ready();
  };
}

hooks.destroy = ({ path }) => {
  state.route.previous = path;
  modules.forEach((m) => m.off());
  const pm = pageModules[path];
  pm?.off();
  pm?.destroy?.();
};

hooks.mount = ({ path }) => {
  state.route.current = path;
  modules.forEach((m) => m.on());
  const pm = pageModules[path];
  pm?.init?.();
  pm?.on?.();
};

window.addEventListener(
  "loader:complete",
  () => {
    hooks.mount?.({ path: location.pathname });
  },
  { once: true },
);
