import { state } from './app.js'
import { Raf } from './raf.js'
import { engine } from './scroll-engine/index.js'

const items = []
let totalHeight = 0
let _getCur = () => 0
let _setMax = null

function calcTotalHeight() {
  totalHeight = 0
  for (let i = 0; i < items.length; i++) {
    totalHeight = Math.max(totalHeight, items[i].rangeE)
  }
  _setMax?.(totalHeight)
}

const sections = {
  connect({ getCur, setMax }) {
    _getCur = getCur
    _setMax = setMax
  },

  // Registra elementos. Las secciones permanecen en flujo normal —
  // solo se les añade will-change y el transform inicial.
  register(els) {
    const cur = _getCur()
    const vh  = window.innerHeight

    // leer todos los rects en batch
    const rects = []
    for (let i = 0; i < els.length; i++) {
      rects.push(els[i].getBoundingClientRect())
    }

    for (let i = 0; i < els.length; i++) {
      const el     = els[i]
      const top    = rects[i].top + cur  // posición en scroll-space
      const height = rects[i].height
      el.style.willChange = 'transform'
      el.style.transform  = `translate3d(0,${-cur}px,0)`
      items.push({ el, top, height, rangeS: top - vh, rangeE: top + height, isOut: false })
    }

    calcTotalHeight()
  },

  auto() {
    this.register([...document.querySelectorAll('section')])
  },

  clear() {
    for (let i = 0; i < items.length; i++) {
      items[i].el.style.willChange = ''
      items[i].el.style.transform  = ''
    }
    items.length = 0
    totalHeight  = 0
    _setMax?.(0)
  },

  // Recalcula geometría sin tocar el DOM — las secciones siguen en flujo normal,
  // así .top del rect es válido (compensado con cur).
  resize() {
    const cur = _getCur()
    const vh  = window.innerHeight

    // leer rects en batch — un único reflow
    const rects = []
    for (let i = 0; i < items.length; i++) {
      rects.push(items[i].el.getBoundingClientRect())
    }

    for (let i = 0; i < items.length; i++) {
      const top    = rects[i].top + cur
      const height = rects[i].height
      items[i].top    = top
      items[i].height = height
      items[i].rangeS = top - vh
      items[i].rangeE = top + height
      items[i].isOut  = false
    }

    calcTotalHeight()
  },

  loop(cur) {
    const y = Math.round(-cur)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (cur > item.rangeS && cur <= item.rangeE) {
        item.isOut = false
        item.el.style.transform = `translate3d(0,${y}px,0)`
      } else if (!item.isOut) {
        item.isOut = true
        item.el.style.transform = `translate3d(0,${y}px,0)`
      }
    }
  },

  get totalHeight() { return totalHeight },
}

// inyectar cur y setMax en sections — sin dependencia circular
sections.connect({
  getCur: () => engine.cur,
  setMax: (h) => engine.setMax(h),
})

export function initScroll() {
  // el engine controla el scroll — aplicar overflow al body
  document.body.style.overflow = 'hidden'
}

new Raf((delta) => {
  const { cur, velocity, moving } = engine.loop(delta)
  state.scroll = cur
  if (!moving) return
  sections.loop(cur)
  window.dispatchEvent(new CustomEvent('scroll:tick', { detail: {
    scroll: cur,
    velocity,
    direction: velocity > 0 ? 1 : velocity < 0 ? -1 : 0,
  }}))
}).run()

window.addEventListener('scroll:reset',   () => engine.scrollTo(0, { immediate: true }))
window.addEventListener('transition:end', () => { sections.clear(); sections.auto(); })
window.addEventListener('loader:complete', () => { sections.auto(); sections.resize(); }, { once: true })

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
  sections,
  on()  { document.addEventListener('keydown', handleKeydown) },
  off() { document.removeEventListener('keydown', handleKeydown) },
  scrollTo(...args) { engine.scrollTo(...args) },
}
