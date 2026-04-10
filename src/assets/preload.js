async function fetchSrcs(path) {
  const res = await fetch(path + '?render');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    buf += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const nl = buf.indexOf('\n');
    if (nl !== -1 || done) {
      reader.cancel();
      const { body } = JSON.parse(buf.slice(0, nl === -1 ? buf.length : nl));
      const doc = new DOMParser().parseFromString(body, 'text/html');
      return [...doc.querySelectorAll('img[src]')].map(img => img.src);
    }
  }
}

const paths = [
  '/nike',
  '/sony',
  '/apple',
];

const srcs = (await Promise.all(paths.map(fetchSrcs))).flat();
window.dispatchEvent(new CustomEvent('loader:track', { detail: srcs }));
window.dispatchEvent(new CustomEvent('loader:ready'));
