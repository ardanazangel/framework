const el = document.getElementById("loader");

let pool = { total: 0, settled: 0, ready: false };

function complete() {
  el.textContent = "100";
  window.dispatchEvent(new CustomEvent("loader:complete"));

  setTimeout(() => {
    el.style.opacity = 0;
  }, 200);
}

function settle() {
  if (!pool.total) return;
  el.textContent = Math.round((++pool.settled / pool.total) * 100);
  if (pool.ready && pool.settled === pool.total) complete();
}

export function track(srcs, type = "image") {
  if (!srcs.length) return;
  pool.total += srcs.length;
  for (const src of srcs) {
    if (type === "video") {
      const p = document.createElement("video");
      p.preload = "metadata";
      p.src = src;
      if (p.readyState >= 1) {
        settle();
        continue;
      }
      p.addEventListener("loadedmetadata", settle, { once: true });
      p.addEventListener("error", settle, { once: true });
    } else {
      const p = new Image();
      p.src = src;
      if (p.complete) {
        settle();
        continue;
      }
      p.onload = p.onerror = settle;
    }
  }
}

export function trackPromise(...promises) {
  pool.total += promises.length;
  for (const p of promises) Promise.resolve(p).then(settle, settle);
}

export function ready() {
  pool.ready = true;
  if (pool.total === 0 || pool.settled === pool.total) complete();
}

window.addEventListener("loader:start", () => {
  pool = { total: 0, settled: 0, ready: false };
  el.textContent = "0";
  el.style.opacity = 1;
});
