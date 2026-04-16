import { track, trackPromise, ready } from './loader.js'

export async function boot({ preload } = {}) {
  const root = document.getElementById('_root')
  const preRendered = root.children.length > 0

  let page, cache = {}, routes = {}

  if (preRendered) {
    // SSG: contenido ya en el DOM, fetch render.json para cache SPA
    const raw = await fetch('/render.json').then(r => r.json())
    const { __routes__: types = {}, ...pages } = raw
    page = pages[location.pathname] ?? { body: root.innerHTML, title: document.title }
    cache = pages
    routes = types
  } else {
    // SSR / Dev: fetch JSON con toda la data de una vez
    const inlined = document.getElementById('__render__')
    const data = inlined
      ? JSON.parse(inlined.textContent)
      : await fetch(location.pathname + '?render').then(r => r.json())

    if (data.title === '404') {
      location.replace('/404')
      return new Promise(() => {})
    }

    document.body.insertAdjacentHTML('afterbegin', data.layout)
    document.title = data.title
    root.innerHTML = data.body ?? ''
    cache = data.cache ?? {}
    routes = data.routes ?? {}
    page = data
  }

  // asset tracking
  track([...root.querySelectorAll('img[src]')].map(img => img.src))
  track([...root.querySelectorAll('video[src]')].map(v => v.src), 'video')
  if (preload) trackPromise(...preload())

  // prefetch tracking desde cache
  for (const [path, { body, prefetch }] of Object.entries(cache)) {
    if (!prefetch || path === location.pathname) continue
    const doc = new DOMParser().parseFromString(body, 'text/html')
    track([...doc.querySelectorAll('img[src]')].map(img => img.src))
    track([...doc.querySelectorAll('video[src]')].map(v => v.getAttribute('src')), 'video')
  }

  ready()
  return { page, cache, routes }
}
