import "./style.css";

import { initRouter } from "./assets/router.ts";
import { splitLines } from "./assets/split-lines.js";
import { on } from "./assets/lifecycle.js";
import { track, ready } from "./assets/loader.js";
import { boot } from "./assets/boot.js";
import { hydrateForm, schemas } from "./assets/form.js";

import "./assets/media.js";
import "./assets/grid.js";

const isMobile = () =>
  navigator.userAgentData?.mobile ??
  (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    navigator.maxTouchPoints > 1);

if (!isMobile()) {
  await import("./assets/scroll.js");
}

const { page, cache } = await boot();

const prefetched = new Set(
  Object.entries(cache).filter(([, { prefetch }]) => prefetch).map(([path]) => path)
);

initRouter({
  [location.pathname]: { body: page.body, title: page.title },
  ...cache,
});

on("page:before-insert", ({ path, el }) => {
  if (prefetched.has(path)) { ready(); return; }
  track([...el.querySelectorAll("img[src]")].map((img) => img.getAttribute("src")));
  track([...el.querySelectorAll("video[src]")].map((v) => v.getAttribute("src")), "video");
  ready();
});

document.fonts.ready.then(() => {
  const els = [...document.querySelectorAll(".lines")];
  splitLines(els);
  document.querySelectorAll(".line-inner").forEach((el, i) => {
    setTimeout(() => el.classList.add("on"), i * 20);
  });
});

on("page:mount", () => {
  splitLines([...document.querySelectorAll(".page .lines")]);
  document.querySelectorAll(".line-inner").forEach((el, i) => {
    setTimeout(() => el.classList.add("on"), i * 20);
  });

  for (const el of document.querySelectorAll("[data-form]")) {
    const schema = schemas[el.dataset.form]
    if (!schema) { console.warn(`[form] no schema found for "${el.dataset.form}"`); continue }
    hydrateForm(el, schema);
  }
});
