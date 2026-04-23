import Lenis from 'lenis'
import { state } from '../app.js'

// ─── instancia activa ────────────────────────────────────────────────────────

let lenis = null
let rafId = null

function destroyLenis() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  if (lenis)          { lenis.destroy(); lenis = null }
}

function initLenis() {
  const wrapper = document.querySelector('.page')
  if (!wrapper) return

  const content = wrapper.querySelector(':scope > .page-content')
  if (!content) { console.warn('[scroll] .page-content no encontrado en .page — Lenis no se inicializa'); return }

  lenis = new Lenis({
    wrapper,
    content,
    duration       : 1.2,
    easing         : (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel    : true,
    touchMultiplier: 2,
  })

  lenis.on('scroll', ({ scroll, velocity, direction }) => {
    state.scroll = scroll
    window.dispatchEvent(new CustomEvent('scroll:tick', {
      detail: { scroll, velocity, direction },
    }))
  })

  function raf(time) {
    lenis.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)
}

// ─── ciclo de vida ────────────────────────────────────────────────────────────

// Primera carga
window.addEventListener('loader:complete', () => initLenis(), { once: true })

// Navegación: destruir y reiniciar en cada cambio de página
window.addEventListener('transition:end', () => {
  destroyLenis()
  initLenis()
})

// ─── controles ───────────────────────────────────────────────────────────────

window.addEventListener('scroll:lock',   () => lenis?.stop())
window.addEventListener('scroll:unlock', () => lenis?.start())
window.addEventListener('scroll:reset',  () => lenis?.scrollTo(0, { immediate: true }))

document.addEventListener('keydown', (e) => {
  if (!lenis || lenis.isStopped) return
  if (e.target.closest('input, textarea, select')) return

  let delta = 0
  if      (e.code === 'ArrowDown'  || e.code === 'ArrowRight') delta =  100
  else if (e.code === 'ArrowUp'    || e.code === 'ArrowLeft')  delta = -100
  else if (e.code === 'Space') delta = (window.innerHeight - 40) * (e.shiftKey ? -1 : 1)
  else return

  e.preventDefault()
  lenis.scrollTo(lenis.scroll + delta)
})

// ─── API pública ──────────────────────────────────────────────────────────────

export const scroll = {
  get instance() { return lenis },
  scrollTo(...args) { lenis?.scrollTo(...args) },
  stop()  { lenis?.stop() },
  start() { lenis?.start() },
}
