import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

function splitContainer(container) {
  const text = container.textContent.trim();
  if (!text) return;

  const style = getComputedStyle(container);
  const font =
    `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`.trim();
  const lineHeight = parseFloat(style.lineHeight);
  const maxWidth = container.clientWidth;

  const prepared = prepareWithSegments(text, font);
  const { lines } = layoutWithLines(prepared, maxWidth, lineHeight);

  container.innerHTML = "";
  for (const line of lines) {
    const inner = document.createElement("span");
    inner.className = "line-inner";
    inner.textContent = line.text;
    const wrap = document.createElement("span");
    wrap.className = "line";
    wrap.appendChild(inner);
    container.appendChild(wrap);
  }
}

function apply(selector) {
  const containers = [...document.querySelectorAll(selector)];
  containers.forEach(splitContainer);
  // scope .line-inner al mismo ancestor para no tocar la página saliente
  containers.forEach((container) => {
    container.querySelectorAll(".line-inner").forEach((el, i) => {
      setTimeout(() => {
        setTimeout(() => el.classList.add("on"), i * 20);
      }, 500);
    });
  });
}

let fontsReady = false;

function run() {
  requestAnimationFrame(() => apply(".page:not(.page-out) .lines"));
}

export const lines = {
  on() {
    if (!fontsReady) {
      document.fonts.ready.then(() => {
        fontsReady = true;
        run();
      });
    } else {
      run();
    }
  },
  off() {},
};
