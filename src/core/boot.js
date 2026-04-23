import { track, trackPromise, ready } from './loader.js'
import { PREFETCH_TYPES } from '../config.js'

export async function boot({ preload } = {}) {
  const root = document.getElementById('_root')

  const data = await fetch(location.pathname + '?render').then(r => r.json())

  if (data.title === '404') {
    location.replace('/404')
    return new Promise(() => {})
  }

  document.body.insertAdjacentHTML('afterbegin', data.layout)
  document.title = data.title
  root.innerHTML = data.body ?? ''

  const cache = data.cache ?? {}
  const routes = data.routes ?? {}
  const page = data

  // asset tracking
  track([...root.querySelectorAll('img[src]')].map(img => img.src))
  track([...root.querySelectorAll('video[src]')].map(v => v.src), 'video')
  if (preload) trackPromise(...preload())

  // prefetch tracking desde cache — se decide por tipo de ruta
  for (const [path, { body }] of Object.entries(cache)) {
    if (!PREFETCH_TYPES.has(routes[path]) || path === location.pathname) continue
    const doc = new DOMParser().parseFromString(body, 'text/html')
    track([...doc.querySelectorAll('img[src]')].map(img => img.src))
    track([...doc.querySelectorAll('video[src]')].map(v => v.getAttribute('src')), 'video')
  }

  ready()
  return { page, cache, routes }
}
