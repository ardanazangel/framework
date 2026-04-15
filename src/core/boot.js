import { track, trackPromise, ready } from './loader.js'

export function streamLines(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  async function readLine() {
    while (true) {
      const { value, done } = await reader.read()
      buf += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      const nl = buf.indexOf('\n')
      if (nl !== -1 || done) {
        const line = buf.slice(0, nl === -1 ? buf.length : nl)
        buf = nl === -1 ? '' : buf.slice(nl + 1)
        return { line, read: readLine }
      }
    }
  }

  return readLine
}

export async function boot({ preload } = {}) {
  const root = document.getElementById('_root')
  const preRendered = root.children.length > 0

  let page, cache = {}

  if (preRendered) {
    // SSG: content already in DOM, fetch render.json for SPA cache
    const data = await fetch('/render.json').then(r => r.json())
    page = data[location.pathname] ?? { body: root.innerHTML, title: document.title }
    cache = data
  } else {
    // SSR / Dev: fetch page data via NDJSON
    const inlined = document.getElementById('__render__')
    const res = inlined
      ? new Response(inlined.textContent, { headers: { 'content-type': 'application/x-ndjson' } })
      : await fetch(location.pathname + '?render')
    const read = streamLines(res)

    let { line, read: next } = await read()
    page = JSON.parse(line)

    if (page.title === '404') {
      location.replace('/404')
      return new Promise(() => {})
    }

    document.body.insertAdjacentHTML('afterbegin', page.layout)
    document.title = page.title
    root.innerHTML = page.body ?? ''

    ;({ line } = await next())
    if (line) ({ cache } = JSON.parse(line))
  }

  // asset tracking
  track([...root.querySelectorAll('img[src]')].map(img => img.src))
  track([...root.querySelectorAll('video[src]')].map(v => v.src), 'video')
  if (preload) trackPromise(...preload())

  // prefetch tracking from cache
  for (const [path, { body, prefetch }] of Object.entries(cache)) {
    if (!prefetch || path === location.pathname) continue
    const doc = new DOMParser().parseFromString(body, 'text/html')
    track([...doc.querySelectorAll('img[src]')].map(img => img.src))
    track([...doc.querySelectorAll('video[src]')].map(v => v.getAttribute('src')), 'video')
  }

  ready()
  return { page, cache }
}
