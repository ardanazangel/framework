import "./style.css";
import { initRouter } from "./core/router.js";
import { hooks, state } from "./core/app.js";
import { track, trackPromise, ready } from "./core/loader.js";
import { boot } from "./core/boot.js";
import { media } from "./core/utils/media.js";
import { lines } from "./core/split-engine/lines-split.js";
import { form } from "./core/form-engine/hydrate.js";
import { home } from "./pages/home.js";
import { about } from "./pages/about.js";
import { morphing } from "./pages/morphing.js";
import { slider } from "./pages/slider.js";

import { detect } from "./core/utils/detect.js";
import { initExperience } from "./core/experience.js";

if (import.meta.env.DEV) import('./core/utils/grid.js')

await initExperience();

const modules = [media, lines, form];
const pageModules = { "/": home, "/about": about, "/morphing": morphing, "/slider": slider };

let scrollEngine = null;

if (!detect.isMobile) {
  const { scroll, initScroll } = await import("./core/scroll-engine/scroll.js");
  scroll.on();
  scrollEngine = scroll.engine;
  const { page, cache } = await boot({
    preload: pageModules[location.pathname]?.preload,
  });
  initScroll();
  bootRouter(page, cache);
} else {
  const { page, cache } = await boot({
    preload: pageModules[location.pathname]?.preload,
  });
  bootRouter(page, cache);
}

function bootRouter(page, cache) {
  const prefetched = new Set(
    Object.entries(cache)
      .filter(([, { prefetch }]) => prefetch)
      .map(([path]) => path),
  );

  initRouter({
    [location.pathname]: { body: page.body, title: page.title },
    ...cache,
  });

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
    setTimeout(() => {
      hooks.mount?.({ path: location.pathname });
    }, 400);
  },
  { once: true },
);
