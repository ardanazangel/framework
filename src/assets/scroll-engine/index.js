// Fake scroll engine. Sin dependencias.
// El scroll nativo está desactivado. El contenido se mueve via translateY.
// cur → posición renderizada. tar → posición objetivo.

const LERP      = 6      // factor de damp (frame-rate independent)
const THRESHOLD = 0.001  // distancia mínima para considerar movimiento (R.Une)

let cur = 0
let tar = 0
let max = 0
let locked = false

let wrapper  = null
let heightEl = null

// damp frame-rate independent — equivalente a R.Damp de arocksworld
// cur + (tar - cur) * (1 - e^(-factor * delta))
function damp(a, b, factor, delta) {
  return a + (b - a) * (1 - Math.exp(-factor * delta))
}

// R.Une — hay movimiento si la diferencia supera el umbral
function moving(a, b) {
  return Math.abs(a - b) > THRESHOLD
}

function resize() {
  if (!wrapper) return
  max = Math.max(0, wrapper.scrollHeight - window.innerHeight)
  if (heightEl) heightEl.style.height = wrapper.scrollHeight + 'px'
}

function clamp(v) { return Math.max(0, Math.min(v, max)) }

// wheel
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

window.addEventListener('scroll:lock',   () => { locked = true })
window.addEventListener('scroll:unlock', () => { locked = false })
window.addEventListener('resize', resize)

export const engine = {
  get locked() { return locked },
  get cur()    { return cur },
  get tar()    { return tar },

  init(wrapperEl) {
    wrapper = wrapperEl
    heightEl = document.createElement('div')
    heightEl.style.cssText = 'position:absolute;top:0;left:0;width:1px;pointer-events:none;visibility:hidden;'
    document.body.appendChild(heightEl)

    resize()
  },

  scrollTo(y, { immediate = false } = {}) {
    tar = clamp(y)
    if (immediate) { cur = tar; if (wrapper) wrapper.style.transform = `translate3d(0,${-cur}px,0)` }
  },

  // delta en segundos — frame-rate independent
  loop(delta) {
    if (!moving(cur, tar)) return { cur, tar, velocity: 0 }

    cur = damp(cur, tar, LERP, delta)
    if (!moving(cur, tar)) cur = tar  // snap final

    // solo escribe al DOM si hay movimiento real
    if (wrapper) wrapper.style.transform = `translate3d(0,${-cur}px,0)`

    return { cur, tar, velocity: tar - cur }
  },

  resize,
}
