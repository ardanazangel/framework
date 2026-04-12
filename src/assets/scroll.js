import { state } from './app.js'
import { Raf } from './raf.js'
import { engine } from './scroll-engine/index.js'

// #_root es el wrapper que se mueve — se inicializa tras el boot
export function initScroll() {
  const root = document.getElementById('_root')
  if (!root) return
  engine.init(root)
}

new Raf((delta) => {
  const { cur, velocity } = engine.loop(delta)
  state.scroll = cur
  if (velocity === 0) return
  window.dispatchEvent(new CustomEvent('scroll:tick', { detail: {
    scroll: cur,
    velocity,
    direction: velocity > 0 ? 1 : velocity < 0 ? -1 : 0,
  }}))
}).run()

window.addEventListener('scroll:reset',   () => engine.scrollTo(0, { immediate: true }))
window.addEventListener('transition:end',  () => engine.resize())
window.addEventListener('loader:complete', () => engine.resize(), { once: true })

function handleKeydown(e) {
  if (e.target.closest('input, textarea, select')) return
  if (engine.locked) return

  let delta = 0
  if      (e.code === 'ArrowDown'  || e.code === 'ArrowRight') delta =  100
  else if (e.code === 'ArrowUp'    || e.code === 'ArrowLeft')  delta = -100
  else if (e.code === 'Space') delta = (window.innerHeight - 40) * (e.shiftKey ? -1 : 1)
  else return

  e.preventDefault()
  engine.scrollTo(engine.tar + delta)
}

export const scroll = {
  engine,
  on()  { document.addEventListener('keydown', handleKeydown) },
  off() { document.removeEventListener('keydown', handleKeydown) },
  scrollTo(...args) { engine.scrollTo(...args) },
}
