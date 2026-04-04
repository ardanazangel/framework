import "./config.css";
import "./style.css";
import { initRouter } from "./assets/router.ts";
import { splitLines } from "./assets/text-split.js";

import './assets/experience.js'

const isMobile = () =>
  navigator.userAgentData?.mobile ??
  (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const isDesktop = () => !isMobile();

if (isDesktop()) {
  await Promise.all([
    import("./assets/scroll.js"),
  ]);
}

const res = await fetch("/render.json");
const pages = await res.json();

const root = document.getElementById("_root");
root.innerHTML = pages[window.location.pathname]?.html ?? "";

initRouter(pages);

splitLines([...document.querySelectorAll(".lines")]);

document.addEventListener("page:before-insert", (e) => {
  requestAnimationFrame(() => {
    splitLines([...e.detail.el.querySelectorAll(".lines")]);
  });
});

document.addEventListener("page:mount", () => {
  document.querySelectorAll(".line-inner").forEach((el, i) => {
    setTimeout(() => el.classList.add("on"), i * 20);
  });
});
