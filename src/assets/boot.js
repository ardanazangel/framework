import { track, ready } from './loader.js';

function readLine(reader, decoder, buf) {
  return new Promise(async (resolve) => {
    while (true) {
      const { value, done } = await reader.read();
      buf += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const nl = buf.indexOf('\n');
      if (nl !== -1 || done) {
        const line = buf.slice(0, nl === -1 ? buf.length : nl);
        const rest = nl === -1 ? '' : buf.slice(nl + 1);
        resolve({ line, rest });
        return;
      }
    }
  });
}

export async function boot() {
  const res = await fetch(location.pathname + '?render');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  // line 1: current page + layout
  let rest = '';
  ({ line: buf, rest } = await readLine(reader, decoder, buf));
  const page = JSON.parse(buf);

  document.body.insertAdjacentHTML('afterbegin', page.layout);
  document.title = page.title;
  const root = document.getElementById('_root');
  root.innerHTML = page.body ?? '';

  track([...root.querySelectorAll('img[src]')].map(img => img.src));
  track([...root.querySelectorAll('video[src]')].map(v => v.src), 'video');

  // line 2: full cache + prefetch tracking
  let cache = {};
  ({ line: buf } = await readLine(reader, decoder, rest));
  if (buf) {
    ({ cache } = JSON.parse(buf));
    for (const [path, { body, prefetch }] of Object.entries(cache)) {
      if (!prefetch || path === location.pathname) continue;
      const doc = new DOMParser().parseFromString(body, 'text/html');
      track([...doc.querySelectorAll('img[src]')].map(img => img.src));
      track([...doc.querySelectorAll('video[src]')].map(v => v.getAttribute('src')), 'video');
    }
  }

  ready();
  return { page, cache };
}
