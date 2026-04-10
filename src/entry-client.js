import "./style.css";

import { initRouter, addToCache } from "./assets/router.ts";
import { splitLines } from "./assets/text-split.js";
import { emit as dispatch, on } from "./assets/lifecycle.js";

import './assets/preload.js';
import './assets/media.js'
import './assets/grid.js'

const isMobile = () =>
  navigator.userAgentData?.mobile ??
  (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const isDesktop = () => !isMobile();

if (isDesktop()) {
  await Promise.all([
    import("./assets/scroll.js"),
  ]);
}

dispatch("loader:start", null);
const res = await fetch(window.location.pathname + "?render");
const reader = res.body.getReader();
const decoder = new TextDecoder();

// first line: current page + layout
let buf = "";
while (true) {
  const { value, done } = await reader.read();
  buf += decoder.decode(value ?? new Uint8Array(), { stream: !done });
  const nl = buf.indexOf("\n");
  if (nl !== -1 || done) {
    const line = buf.slice(0, nl === -1 ? buf.length : nl);
    buf = nl === -1 ? "" : buf.slice(nl + 1);
    var data = JSON.parse(line);
    break;
  }
}

document.body.insertAdjacentHTML("afterbegin", data.layout);
document.title = data.title;

const root = document.getElementById("_root");
root.innerHTML = data.body ?? "";

window.dispatchEvent(new CustomEvent('loader:track', {
  detail: [...root.querySelectorAll('img[src]')].map(img => img.src)
}));

window.dispatchEvent(new CustomEvent('loader:ready'));

on("page:before-insert", ({ el }) => {
  window.dispatchEvent(new CustomEvent('loader:track', {
    detail: [...el.querySelectorAll('img[src]')].map(img => img.getAttribute('src'))
  }));
  window.dispatchEvent(new CustomEvent('loader:ready'));
});

initRouter();
addToCache({ [window.location.pathname]: { body: data.body, title: data.title } });
(async () => {
  while (true) {
    const { value, done } = await reader.read();
    buf += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const nl = buf.indexOf("\n");
    if (nl !== -1 || done) {
      const line = buf.slice(0, nl === -1 ? buf.length : nl);
      if (line) addToCache(JSON.parse(line).cache);
      break;
    }
  }
})();

splitLines([...document.querySelectorAll(".lines")]);

on("page:mount", () => {
  splitLines([...document.querySelectorAll(".page .lines")]);
  document.querySelectorAll(".line-inner").forEach((el, i) => {
    setTimeout(() => el.classList.add("on"), i * 20);
  });
});
