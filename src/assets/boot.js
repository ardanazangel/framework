import { track, ready } from './loader.js'

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

export async function boot() {
  const res = await fetch(location.pathname + '?render')
  const read = streamLines(res)

  // line 1: current page + layout
  let { line, read: next } = await read()
  const page = JSON.parse(line)

  document.body.insertAdjacentHTML('afterbegin', page.layout)
  document.title = page.title
  const root = document.getElementById('_root')
  root.innerHTML = page.body ?? ''

  track([...root.querySelectorAll('img[src]')].map(img => img.src))
  track([...root.querySelectorAll('video[src]')].map(v => v.src), 'video')

  // line 2: full cache + prefetch tracking
  let cache = {};
  ({ line } = await next())
  if (line) {
    ({ cache } = JSON.parse(line))
    for (const [path, { body, prefetch }] of Object.entries(cache)) {
      if (!prefetch || path === location.pathname) continue
      const doc = new DOMParser().parseFromString(body, 'text/html')
      track([...doc.querySelectorAll('img[src]')].map(img => img.src))
      track([...doc.querySelectorAll('video[src]')].map(v => v.getAttribute('src')), 'video')
    }
  }

  ready()
  return { page, cache }
}
