import { on } from "./lifecycle.js";

let progress = 0;
let raf = null;
let done = false;
let bar = null;

function speed() {
  if (done && progress >= 100) return 0.08;
  if (done) return 0.3;
  if (progress < 83) return 0.03;
  return 0;
}

function step() {
  if (!bar) return;
  const target = done ? 210 : 85;
  progress += (target - progress) * speed() * (0.9 + Math.random() * 0.2);
  bar.style.transform = `translate3d(${-100 + progress}vw, 0, 0)`;

  if (done && progress >= 209.5) {
    const el = bar;
    bar = null;
    raf = null;
    el.remove();
    return;
  }

  raf = requestAnimationFrame(step);
}

on("loader:start", () => {
  bar?.remove();
  bar = document.createElement("div");
  bar.id = "loader";
  Object.assign(bar.style, {
    position: "fixed",
    bottom: "0",
    left: "0",
    width: "100vw",
    height: "0.5em",
    background: "red",
    transform: "translate3d(-100vw, 0, 0)",
    willChange: "transform",
    pointerEvents: "none",
    zIndex: "9999",
  });
  document.body.appendChild(bar);

  progress = 0;
  done = false;
  setTimeout(() => { if (bar) raf = requestAnimationFrame(step); }, 200);
});

on("page:before-insert", () => {
  done = true;
  if (!raf) raf = requestAnimationFrame(step);
});

on("page:mount", () => {
  done = true;
  if (!raf) raf = requestAnimationFrame(step);
});
