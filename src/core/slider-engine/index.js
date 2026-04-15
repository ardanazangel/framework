// Slider engine — infinite + finite, snap, drag, wheel, touch

import { damp, symmetricMod, LAMBDA } from '../utils/math.js'

// ─── defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  infinite:         true,
  snap:             true,
  lerpFactor:       1 / LAMBDA, // sincronizado con el scroll engine
  snapStrength:     0.08,   // pull hacia snap por frame
  speedDecay:       0.85,
  dragSensitivity:  1,      // 1 = drag de 1 itemWidth → mueve 1 slide
  wheelSensitivity: 0.003,
  onSlideChange:    null,   // (current, previous) => void
  onUpdate:         null,   // (slider) => void
}

// ─── Slider ───────────────────────────────────────────────────────────────────

export class Slider {
  // state
  #current  = 0
  #target   = 0
  #speed    = 0
  #prevTime = 0

  // drag
  #dragging        = false
  #dragX           = 0
  #dragTargetStart = 0
  #touchPrevX      = 0
  #touchStartX     = 0
  #touchStartY     = 0
  #scrollDir       = null

  // meta
  #active       = false
  #visible      = false
  #currentSlide = 0
  #prevSlide    = 0
  #itemWidth    = 0
  #maxScroll    = 0   // siempre <= 0

  // público — se actualiza cada frame en update()
  // infinite: posición en slide units desde el centro [-len/2, len/2], 0 = centrado
  // finite:   posición en pixels desde el borde izquierdo del wrapper
  parallaxValues = []

  constructor(wrapper, config = {}) {
    this.wrapper = wrapper
    this.items   = [...wrapper.children]
    this.config  = { ...DEFAULTS, ...config }

    this.#measure()
    this.#bindEvents()
    this.#observe()

  }

  // ─── setup ─────────────────────────────────────────────────────────────────

  #measure() {
    this.#itemWidth = this.items[0]?.getBoundingClientRect().width ?? 0
    this.#maxScroll = -(this.items.length - 1)
  }

  #observe() {
    this._io = new IntersectionObserver(
      ([e]) => { this.#visible = e.isIntersecting },
      { rootMargin: '50px' }
    )
    this._io.observe(this.wrapper)

    this._ro = new ResizeObserver(() => this.resize())
    this._ro.observe(this.wrapper)
  }

  #bindEvents() {
    this._h = {
      mousedown:  e  => this.#onDragStart(e.clientX),
      mousemove:  e  => this.#onDragMove(e.clientX, e.movementX),
      mouseup:    () => this.#onDragEnd(),
      touchstart: e  => this.#onTouchStart(e),
      touchmove:  e  => this.#onTouchMove(e),
      touchend:   () => this.#onDragEnd(),
      wheel:      e  => this.#onWheel(e),
    }

    this.wrapper.addEventListener('mousedown',  this._h.mousedown)
    window.addEventListener      ('mousemove',  this._h.mousemove)
    window.addEventListener      ('mouseup',    this._h.mouseup)
    this.wrapper.addEventListener('touchstart', this._h.touchstart)
    window.addEventListener      ('touchmove',  this._h.touchmove, { passive: false })
    window.addEventListener      ('touchend',   this._h.touchend)
    this.wrapper.addEventListener('wheel',      this._h.wheel, { passive: true })
  }

  // ─── drag ──────────────────────────────────────────────────────────────────

  #onDragStart(x) {
    this.#dragging        = true
    this.#dragX           = x
    this.#dragTargetStart = this.#target
  }

  #onDragMove(x, movement) {
    if (!this.#dragging) return
    const delta = x - this.#dragX
    const sensitivity = this.config.dragSensitivity / (this.#itemWidth || 1)
    this.#target = this.#clamp(this.#dragTargetStart + delta * sensitivity)
    this.#speed += movement * 0.01
  }

  #onDragEnd() {
    if (!this.#dragging) return
    this.#dragging = false
    if (this.config.snap) this.#target = this.#clamp(Math.round(this.#target))
  }

  // ─── touch ─────────────────────────────────────────────────────────────────

  #onTouchStart(e) {
    const t = e.touches[0]
    this.#touchStartX = t.clientX
    this.#touchStartY = t.clientY
    this.#touchPrevX  = t.clientX
    this.#scrollDir   = null
    this.#onDragStart(t.clientX)
  }

  #onTouchMove(e) {
    const t  = e.touches[0]
    const dx = Math.abs(t.clientX - this.#touchStartX)
    const dy = Math.abs(t.clientY - this.#touchStartY)

    if (!this.#scrollDir && (dx > 5 || dy > 5))
      this.#scrollDir = dx > dy ? 'h' : 'v'

    if (this.#scrollDir === 'h') {
      e.preventDefault()
      const movement = t.clientX - this.#touchPrevX
      this.#onDragMove(t.clientX, movement)
      this.#touchPrevX = t.clientX
    }
  }

  // ─── wheel ─────────────────────────────────────────────────────────────────

  #onWheel(e) {
    if (this.#dragging) return
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    this.#target = this.#clamp(this.#target - delta * this.config.wheelSensitivity)
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  #clamp(value) {
    if (this.config.infinite) return value
    return Math.min(0, Math.max(this.#maxScroll, value))
  }

  #setSlide(index) {
    const len = this.items.length
    const i   = ((index % len) + len) % len
    if (i === this.#currentSlide) return
    this.#prevSlide    = this.#currentSlide
    this.#currentSlide = i
    this.config.onSlideChange?.(this.#currentSlide, this.#prevSlide)
  }

  // ─── update ────────────────────────────────────────────────────────────────

  update() {
    if (!this.#visible || !this.#active) return

    const now = performance.now()
    const dt  = this.#prevTime ? (now - this.#prevTime) / 1000 : 0
    this.#prevTime = now

    // pull hacia snap
    if (this.config.snap && !this.#dragging) {
      const snapped = Math.round(this.#target)
      this.#target += (snapped - this.#target) * this.config.snapStrength
    }

    // interpolar
    this.#current = damp(this.#current, this.#target, 1 / this.config.lerpFactor, dt)
    this.#speed  *= this.config.speedDecay

    const w   = this.#itemWidth
    const len = this.items.length

    if (this.config.infinite) {
      this.#setSlide(((Math.round(-this.#current) % len) + len) % len)

      this.parallaxValues = this.items.map((item, i) => {
        // pos: posición del slide en "slide units" relativa al viewport
        //   0  = slide centrado en el viewport
        //  +1  = un slide a la derecha
        //  -1  = un slide a la izquierda
        const pos = symmetricMod(this.#current + i, len)
        item.style.transform = `translateX(${(pos - i) * w}px)`
        return pos
      })
    } else {
      this.#setSlide(Math.round(Math.abs(this.#current)))
      const translate = this.#current * w
      this.parallaxValues = this.items.map((item, i) => {
        item.style.transform = `translateX(${translate}px)`
        // posición en pixels del borde izquierdo de este slide dentro del wrapper
        return translate + i * w
      })
    }

    this.config.onUpdate?.(this)
  }

  // ─── API pública ───────────────────────────────────────────────────────────

  goToNext()       { this.#target = this.#clamp(Math.round(this.#target - 1)) }
  goToPrev()       { this.#target = this.#clamp(Math.round(this.#target + 1)) }
  goToIndex(index) { this.#target = this.#clamp(-index) }

  get currentSlide() { return this.#currentSlide }
  get current()      { return this.#current }
  get target()       { return this.#target }
  get speed()        { return this.#speed }

  get progress() {
    if (this.config.infinite) {
      const len = this.items.length
      return (((- this.#current % len) + len) % len) / len
    }
    const total = Math.abs(this.#maxScroll)
    return total ? Math.abs(this.#current) / total : 0
  }

  resize() { this.#measure() }

  init() {
    this.#active   = true
    this.#prevTime = performance.now()
  }

  destroy() {
    this.#active = false
    this.wrapper.removeEventListener('mousedown',  this._h.mousedown)
    window.removeEventListener       ('mousemove',  this._h.mousemove)
    window.removeEventListener       ('mouseup',    this._h.mouseup)
    this.wrapper.removeEventListener('touchstart', this._h.touchstart)
    window.removeEventListener       ('touchmove',  this._h.touchmove)
    window.removeEventListener       ('touchend',   this._h.touchend)
    this.wrapper.removeEventListener('wheel',      this._h.wheel)
    this._ro.disconnect()
    this._io.disconnect()
    this.items.forEach(item => (item.style.transform = ''))
  }
}
