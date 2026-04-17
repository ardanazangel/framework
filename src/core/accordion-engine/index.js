// Accordion engine — altura animada con damp, identificado por clases CSS
//
// HTML esperado:
//   <div class="accordion">
//     <div class="accordion-item">
//       <button class="accordion-trigger">Título</button>
//       <div class="accordion-panel">Contenido</div>
//     </div>
//     ...
//   </div>
//
// Clase añadida al item activo: accordion-item--open

import { damp, LAMBDA } from '../utils/math.js'
import { Raf } from '../utils/raf.js'

// ─── defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  exclusive:   true,   // solo un item abierto a la vez
  lerpFactor:  1 / LAMBDA,
  activeIndex: null,   // index abierto por defecto (sin animación)
  onOpen:      null,   // (index) => void
  onClose:     null,   // (index) => void
  onUpdate:    null,   // (accordion) => void
}

// ─── Accordion ────────────────────────────────────────────────────────────────

export class Accordion {
  #items  = []
  #active = false

  constructor(wrapper, config = {}) {
    this.wrapper = wrapper
    this.config  = { ...DEFAULTS, ...config }

    this.#build()
    this.#bindEvents()
    this.#observe()
  }

  // ─── setup ─────────────────────────────────────────────────────────────────

  #build() {
    const itemEls = [...this.wrapper.querySelectorAll('.accordion-item')]

    this.#items = itemEls.map((el) => {
      const trigger = el.querySelector('.accordion-trigger')
      const panel   = el.querySelector('.accordion-panel')

      panel.style.overflow = 'hidden'
      panel.style.height   = '0px'
      trigger.setAttribute('aria-expanded', 'false')

      // state: 'closed' | 'opening' | 'open' | 'closing'
      return { el, trigger, panel, naturalH: 0, currentH: 0, targetH: 0, state: 'closed' }
    })

    // item activo por defecto — sin animación
    if (this.config.activeIndex !== null) {
      const item = this.#items[this.config.activeIndex]
      if (item) {
        item.naturalH = item.panel.scrollHeight
        item.currentH = item.naturalH
        item.targetH  = item.naturalH
        item.state    = 'open'
        item.panel.style.height   = ''
        item.panel.style.overflow = ''
        item.el.classList.add('accordion-item--open')
        item.trigger.setAttribute('aria-expanded', 'true')
      }
    }
  }

  #measure() {
    // scrollHeight devuelve el alto natural aunque el panel esté a height:0/overflow:hidden
    for (const item of this.#items) {
      item.naturalH = item.panel.scrollHeight
    }
  }

  #bindEvents() {
    this._h = {
      click: (e) => {
        const trigger = e.target.closest('.accordion-trigger')
        if (!trigger) return
        const index = this.#items.findIndex(item => item.trigger === trigger)
        if (index !== -1) this.toggle(index)
      },
    }
    this.wrapper.addEventListener('click', this._h.click)
  }

  #observe() {
    this._ro = new ResizeObserver(() => this.resize())
    this._ro.observe(this.wrapper)
  }

  // ─── tick ──────────────────────────────────────────────────────────────────

  #tick(dt) {
    if (!this.#active) return

    for (const item of this.#items) {
      if (item.state === 'open' || item.state === 'closed') continue

      item.currentH = damp(item.currentH, item.targetH, 1 / this.config.lerpFactor, dt)
      item.panel.style.height = `${item.currentH}px`

      if (Math.abs(item.currentH - item.targetH) < 0.5) {
        item.currentH = item.targetH

        if (item.targetH === 0) {
          item.panel.style.height = '0px'
          item.state = 'closed'
        } else {
          item.panel.style.height   = ''  // volver a auto — se adapta a contenido dinámico
          item.panel.style.overflow = ''
          item.state = 'open'
        }
      }
    }

    this.config.onUpdate?.(this)
  }

  // ─── API pública ───────────────────────────────────────────────────────────

  open(index) {
    const item = this.#items[index]
    if (!item || item.state === 'open' || item.state === 'opening') return

    if (this.config.exclusive) {
      for (let i = 0; i < this.#items.length; i++) {
        if (i !== index) this.close(i)
      }
    }

    item.panel.style.overflow = 'hidden'
    item.targetH = item.naturalH
    item.state   = 'opening'
    item.el.classList.add('accordion-item--open')
    item.trigger.setAttribute('aria-expanded', 'true')
    this.config.onOpen?.(index)
  }

  close(index) {
    const item = this.#items[index]
    if (!item || item.state === 'closed' || item.state === 'closing') return

    // si estaba 'open' (height: auto), capturar el alto real antes de animar
    if (item.state === 'open') {
      item.currentH = item.panel.getBoundingClientRect().height
      item.panel.style.height = `${item.currentH}px`
    }

    item.panel.style.overflow = 'hidden'
    item.targetH = 0
    item.state   = 'closing'
    item.el.classList.remove('accordion-item--open')
    item.trigger.setAttribute('aria-expanded', 'false')
    this.config.onClose?.(index)
  }

  toggle(index) {
    const item = this.#items[index]
    if (!item) return
    item.state === 'open' || item.state === 'opening'
      ? this.close(index)
      : this.open(index)
  }

  closeAll() {
    for (let i = 0; i < this.#items.length; i++) this.close(i)
  }

  get openIndices() {
    return this.#items
      .map((item, i) => item.state === 'open' || item.state === 'opening' ? i : -1)
      .filter(i => i !== -1)
  }

  resize() {
    this.#measure()
    // sincronizar target con el nuevo alto para items en tránsito o abiertos
    for (const item of this.#items) {
      if (item.state === 'open') {
        item.currentH = item.naturalH
        item.targetH  = item.naturalH
      } else if (item.state === 'opening') {
        item.targetH = item.naturalH
      }
    }
  }

  init() {
    this.#active = true
    this.#measure()
    this._raf = new Raf((dt) => this.#tick(dt))
    this._raf.run()
  }

  destroy() {
    this.#active = false
    this._raf?.stop()
    this.wrapper.removeEventListener('click', this._h.click)
    this._ro.disconnect()

    for (const item of this.#items) {
      item.panel.style.height   = ''
      item.panel.style.overflow = ''
      item.el.classList.remove('accordion-item--open')
      item.trigger.removeAttribute('aria-expanded')
    }

    this.#items = []
  }
}
