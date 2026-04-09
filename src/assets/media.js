import { on } from "./lifecycle.js";

let observer;

function init() {
  const elements = document.querySelectorAll("img[loading='lazy'], video[loading='lazy']");

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("loaded");
          observer.unobserve(entry.target);
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
