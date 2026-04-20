// Scroll engine. Solo números — no toca el DOM.
// cur → posición renderizada. tar → posición objetivo.

import { damp, clamp as _clamp, LAMBDA } from '../utils/math.js'

const LERP      = LAMBDA // factor de damp (frame-rate independent)
const THRESHOLD = 0.001  // umbral de parada

let cur    = 0
let tar    = 0
let max    = 0
let locked = false

function clamp(v) { return _clamp(v, 0, max) }

window.addEventListener('wheel', (e) => {
  e.preventDefault()
  if (!locked) tar = clamp(tar + e.deltaY)
}, { passive: false })

// touch
let touchPrev = 0
window.addEventListener('touchstart', (e) => { touchPrev = e.touches[0].clientY }, { passive: true })
window.addEventListener('touchmove', (e) => {
  if (locked) return
  tar = clamp(tar - (e.touches[0].clientY - touchPrev))
  touchPrev = e.touches[0].clientY
}, { passive: true })

window.addEventListener('scroll:lock',   () => { locked = true  })
window.addEventListener('scroll:unlock', () => { locked = false })

export const engine = {
  get cur()    { return cur },
  get tar()    { return tar },
  get locked() { return locked },

  // la altura total del contenido la pasa sections.js al hacer resize
  setMax(totalHeight) {
    max = Math.max(0, totalHeight - window.innerHeight)
  },

  scrollTo(y, { immediate = false } = {}) {
    tar = clamp(y)
    if (immediate) cur = tar
  },

  loop(delta) {
    const diff = Math.abs(cur - tar)
    if (diff <= THRESHOLD) { cur = tar; return { cur, tar, velocity: 0, moving: false } }
    cur = damp(cur, tar, LERP, delta)
    return { cur, tar, velocity: tar - cur, moving: true }
  },
}
