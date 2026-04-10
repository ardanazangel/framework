import { on } from "./lifecycle.js";

let observer;

function init() {
  const elements = document.querySelectorAll("img[loading='lazy'], video[loading='lazy']");

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        if (el.complete) {
          el.classList.add("loaded");
        } else {
          el.addEventListener("load", () => el.classList.add("loaded"), { once: true });
          el.addEventListener("error", () => el.classList.add("loaded"), { once: true });
        }
      });
    },
    { rootMargin: "0px 0px 200px 0px", threshold: 0 }
  );

  elements.forEach((el) => observer.observe(el));
}

on("page:mount", () => {
  if (observer) {
    observer.disconnect();
  }
  init();
});
