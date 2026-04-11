import { track, ready } from './loader.js'
import { streamLines } from './stream.js'

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
