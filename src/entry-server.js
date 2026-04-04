import home from "./pages/home.html?raw";
import about from "./pages/about.html?raw";
import { splitText } from "./assets/text-split.js";

const routes = {
  "/": home,
  "/about": about,
};

const processedRoutes = Object.fromEntries(
  Object.entries(routes).map(([url, html]) => [url, splitText(html)]),
);

export function render(url) {
  return { html: processedRoutes[url] ?? "<pre>404</pre>" };
}

export function renderAll() {
  return Object.fromEntries(
    Object.keys(processedRoutes).map((url) => [url, render(url)]),
  );
}
