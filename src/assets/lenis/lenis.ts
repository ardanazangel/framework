import { Animate } from './animate'
import { Dimensions } from './dimensions'
import { Emitter } from './emitter'
import { clamp } from './maths'
import type {
  LenisEvent,
  LenisOptions,
  ScrollCallback,
  Scrolling,
  ScrollToOptions,
  UserData,
  VirtualScrollCallback,
  VirtualScrollData,
} from './types'
import { VirtualScroll } from './virtual-scroll'

const defaultEasing = (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t))

export class Lenis {
  private _isScrolling: Scrolling = false
  private _isStopped = false
  private _isLocked = false
  private _preventNextNativeScrollEvent = false
  private _resetVelocityTimeout: ReturnType<typeof setTimeout> | null = null
  private _rafId: number | null = null

  time = 0
  userData: UserData = {}
  lastVelocity = 0
  velocity = 0
  direction: 1 | -1 | 0 = 0
  options: {
    wrapper: HTMLElement | Window
    content: HTMLElement | Element
    eventsTarget: HTMLElement | Window
    smoothWheel: boolean
    duration?: number
    easing?: (t: number) => number
    lerp: number
    orientation: string
    gestureOrientation: string
    wheelMultiplier: number
    autoResize: boolean
    prevent?: (node: HTMLElement) => boolean
    virtualScroll?: (data: VirtualScrollData) => boolean
    overscroll: boolean
    autoRaf: boolean
    naiveDimensions: boolean
  }
  targetScroll: number
  animatedScroll: number

  private readonly animate = new Animate()
  private readonly emitter = new Emitter()
  readonly dimensions: Dimensions
  private readonly virtualScroll: VirtualScroll

  constructor({
    wrapper = window,
    content = document.documentElement,
    eventsTarget = wrapper,
    smoothWheel = true,
    duration,
    easing,
    lerp = 0.1,
    orientation = 'vertical',
    gestureOrientation = orientation === 'horizontal' ? 'both' : 'vertical',
    wheelMultiplier = 1,
    autoResize = true,
    prevent,
    virtualScroll,
    overscroll = true,
    autoRaf = false,
    __experimental__naiveDimensions = false,
    naiveDimensions = __experimental__naiveDimensions,
  }: LenisOptions = {}) {
    if (!wrapper || wrapper === document.documentElement) {
      wrapper = window
    }

    if (typeof duration === 'number' && typeof easing !== 'function') {
      easing = defaultEasing
    } else if (typeof easing === 'function' && typeof duration !== 'number') {
      duration = 1
    }

    this.options = {
      wrapper,
      content,
      eventsTarget,
      smoothWheel,
      duration,
      easing,
      lerp,
      gestureOrientation,
      orientation,
      wheelMultiplier,
      autoResize,
      prevent,
      virtualScroll,
      overscroll,
      autoRaf,
      naiveDimensions,
    }

    this.dimensions = new Dimensions(wrapper, content, { autoResize })
    this.targetScroll = this.animatedScroll = this.actualScroll

    this.options.wrapper.addEventListener('scroll', this.onNativeScroll)
    this.options.wrapper.addEventListener('scrollend', this.onScrollEnd, { capture: true })
    this.options.wrapper.addEventListener('pointerdown', this.onPointerDown as EventListener)

    this.virtualScroll = new VirtualScroll(eventsTarget as HTMLElement, { wheelMultiplier })
    this.virtualScroll.on('scroll', this.onVirtualScroll)

    if (this.options.autoRaf) {
      this._rafId = requestAnimationFrame(this.raf)
    }
  }

  destroy() {
    this.emitter.destroy()
    this.options.wrapper.removeEventListener('scroll', this.onNativeScroll)
    this.options.wrapper.removeEventListener('scrollend', this.onScrollEnd, { capture: true })
    this.options.wrapper.removeEventListener('pointerdown', this.onPointerDown as EventListener)
    this.virtualScroll.destroy()
    this.dimensions.destroy()

    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
    }
  }

  on(event: 'scroll', callback: ScrollCallback): () => void
  on(event: 'virtual-scroll', callback: VirtualScrollCallback): () => void
  on(event: LenisEvent, callback: ScrollCallback | VirtualScrollCallback) {
    return this.emitter.on(event, callback as (...args: unknown[]) => void)
  }

  off(event: 'scroll', callback: ScrollCallback): void
  off(event: 'virtual-scroll', callback: VirtualScrollCallback): void
  off(event: LenisEvent, callback: ScrollCallback | VirtualScrollCallback) {
    return this.emitter.off(event, callback as (...args: unknown[]) => void)
  }

  private onScrollEnd = (e: Event | CustomEvent) => {
    if (!(e instanceof CustomEvent)) {
      if (this.isScrolling === 'smooth' || this.isScrolling === false) {
        e.stopPropagation()
      }
    }
  }

  private dispatchScrollendEvent = () => {
    this.options.wrapper.dispatchEvent(
      new CustomEvent('scrollend', {
        bubbles: this.options.wrapper === window,
        detail: { lenisScrollEnd: true },
      })
    )
  }

  private setScroll(scroll: number) {
    if (this.isHorizontal) {
      this.options.wrapper.scrollTo({ left: scroll, behavior: 'instant' })
    } else {
      this.options.wrapper.scrollTo({ top: scroll, behavior: 'instant' })
    }
  }

  private onPointerDown = (event: PointerEvent | MouseEvent) => {
    if (event.button === 1) {
      this.reset()
    }
  }

  private onVirtualScroll = (data: VirtualScrollData) => {
    if (
      typeof this.options.virtualScroll === 'function' &&
      this.options.virtualScroll(data) === false
    ) return

    const { deltaX, deltaY, event } = data

    this.emitter.emit('virtual-scroll', { deltaX, deltaY, event })

    if (event.ctrlKey) return
    // @ts-expect-error
    if (event.lenisStopPropagation) return

    const isClickOrTap = deltaX === 0 && deltaY === 0
    const isUnknownGesture =
      (this.options.gestureOrientation === 'vertical' && deltaY === 0) ||
      (this.options.gestureOrientation === 'horizontal' && deltaX === 0)

    if (isClickOrTap || isUnknownGesture) return

    let composedPath = event.composedPath()
    composedPath = composedPath.slice(0, composedPath.indexOf(this.rootElement))

    const prevent = this.options.prevent
    const gestureOrientation = Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical'

    if (
      composedPath.find(
        (node) =>
          node instanceof HTMLElement &&
          ((typeof prevent === 'function' && prevent?.(node)) ||
            node.hasAttribute?.('data-lenis-prevent') ||
            (gestureOrientation === 'vertical' && node.hasAttribute?.('data-lenis-prevent-vertical')) ||
            (gestureOrientation === 'horizontal' && node.hasAttribute?.('data-lenis-prevent-horizontal')) ||
            node.hasAttribute?.('data-lenis-prevent-wheel'))
      )
    ) return

    if (this.isStopped || this.isLocked) {
      if (event.cancelable) event.preventDefault()
      return
    }

    if (!this.options.smoothWheel) {
      this.isScrolling = 'native'
      this.animate.stop()
      // @ts-expect-error
      event.lenisStopPropagation = true
      return
    }

    let delta = deltaY
    if (this.options.gestureOrientation === 'both') {
      delta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX
    } else if (this.options.gestureOrientation === 'horizontal') {
      delta = deltaX
    }

    if (
      !this.options.overscroll ||
      (this.options.wrapper !== window &&
        this.limit > 0 &&
        ((this.animatedScroll > 0 && this.animatedScroll < this.limit) ||
          (this.animatedScroll === 0 && deltaY > 0) ||
          (this.animatedScroll === this.limit && deltaY < 0)))
    ) {
      // @ts-expect-error
      event.lenisStopPropagation = true
    }

    if (event.cancelable) event.preventDefault()

    this.scrollTo(this.targetScroll + delta, {
      programmatic: false,
      lerp: this.options.lerp,
      duration: this.options.duration,
      easing: this.options.easing,
    })
  }

  resize() {
    this.dimensions.resize()
    this.animatedScroll = this.targetScroll = this.actualScroll
    this.emit()
  }

  private emit() {
    this.emitter.emit('scroll', this)
  }

  private onNativeScroll = () => {
    if (this._resetVelocityTimeout !== null) {
      clearTimeout(this._resetVelocityTimeout)
      this._resetVelocityTimeout = null
    }

    if (this._preventNextNativeScrollEvent) {
      this._preventNextNativeScrollEvent = false
      return
    }

    if (this.isScrolling === false || this.isScrolling === 'native') {
      const lastScroll = this.animatedScroll
      this.animatedScroll = this.targetScroll = this.actualScroll
      this.lastVelocity = this.velocity
      this.velocity = this.animatedScroll - lastScroll
      this.direction = Math.sign(this.animatedScroll - lastScroll) as Lenis['direction']

      if (!this.isStopped) {
        this.isScrolling = 'native'
      }

      this.emit()

      if (this.velocity !== 0) {
        this._resetVelocityTimeout = setTimeout(() => {
          this.lastVelocity = this.velocity
          this.velocity = 0
          this.isScrolling = false
          this.emit()
        }, 400)
      }
    }
  }

  private reset() {
    this.isLocked = false
    this.isScrolling = false
    this.animatedScroll = this.targetScroll = this.actualScroll
    this.lastVelocity = this.velocity = 0
    this.animate.stop()
  }

  start() {
    if (!this.isStopped) return
    this.internalStart()
  }

  private internalStart() {
    if (!this.isStopped) return
    this.reset()
    this.isStopped = false
    this.emit()
  }

  stop() {
    if (this.isStopped) return
    this.internalStop()
  }

  private internalStop() {
    if (this.isStopped) return
    this.reset()
    this.isStopped = true
    this.emit()
  }

  raf = (time: number) => {
    const deltaTime = time - (this.time || time)
    this.time = time
    this.animate.advance(deltaTime * 0.001)

    if (this.options.autoRaf) {
      this._rafId = requestAnimationFrame(this.raf)
    }
  }

  scrollTo(
    _target: number | string | HTMLElement,
    {
      offset = 0,
      immediate = false,
      lock = false,
      programmatic = true,
      lerp = programmatic ? this.options.lerp : undefined,
      duration = programmatic ? this.options.duration : undefined,
      easing = programmatic ? this.options.easing : undefined,
      onStart,
      onComplete,
      force = false,
      userData,
    }: ScrollToOptions = {}
  ) {
    if ((this.isStopped || this.isLocked) && !force) return

    let target: number | string | HTMLElement = _target
    let adjustedOffset = offset

    if (typeof target === 'string' && ['top', 'left', 'start', '#'].includes(target)) {
      target = 0
    } else if (typeof target === 'string' && ['bottom', 'right', 'end'].includes(target)) {
      target = this.limit
    } else {
      let node: Element | null = null

      if (typeof target === 'string') {
        node = document.querySelector(target)
        if (!node) {
          if (target === '#top') {
            target = 0
          } else {
            console.warn('Lenis: Target not found', target)
          }
        }
      } else if (target instanceof HTMLElement && target?.nodeType) {
        node = target
      }

      if (node) {
        if (this.options.wrapper !== window) {
          const wrapperRect = this.rootElement.getBoundingClientRect()
          adjustedOffset -= this.isHorizontal ? wrapperRect.left : wrapperRect.top
        }

        const rect = node.getBoundingClientRect()
        const targetStyle = getComputedStyle(node)
        const scrollMargin = this.isHorizontal
          ? Number.parseFloat(targetStyle.scrollMarginLeft)
          : Number.parseFloat(targetStyle.scrollMarginTop)

        const containerStyle = getComputedStyle(this.rootElement)
        const scrollPadding = this.isHorizontal
          ? Number.parseFloat(containerStyle.scrollPaddingLeft)
          : Number.parseFloat(containerStyle.scrollPaddingTop)

        target =
          (this.isHorizontal ? rect.left : rect.top) +
          this.animatedScroll -
          (Number.isNaN(scrollMargin) ? 0 : scrollMargin) -
          (Number.isNaN(scrollPadding) ? 0 : scrollPadding)
      }
    }

    if (typeof target !== 'number') return

    target += adjustedOffset
    target = Math.round(target)
    target = clamp(0, target, this.limit)

    if (target === this.targetScroll) {
      onStart?.(this)
      onComplete?.(this)
      return
    }

    this.userData = userData ?? {}

    if (immediate) {
      this.animatedScroll = this.targetScroll = target
      this.setScroll(this.scroll)
      this.reset()
      this.preventNextNativeScrollEvent()
      this.emit()
      onComplete?.(this)
      this.userData = {}
      requestAnimationFrame(() => { this.dispatchScrollendEvent() })
      return
    }

    if (!programmatic) {
      this.targetScroll = target
    }

    if (typeof duration === 'number' && typeof easing !== 'function') {
      easing = defaultEasing
    } else if (typeof easing === 'function' && typeof duration !== 'number') {
      duration = 1
    }

    this.animate.fromTo(this.animatedScroll, target, {
      duration,
      easing,
      lerp,
      onStart: () => {
        if (lock) this.isLocked = true
        this.isScrolling = 'smooth'
        onStart?.(this)
      },
      onUpdate: (value: number, completed: boolean) => {
        this.isScrolling = 'smooth'
        this.lastVelocity = this.velocity
        this.velocity = value - this.animatedScroll
        this.direction = Math.sign(this.velocity) as Lenis['direction']
        this.animatedScroll = value
        this.setScroll(this.scroll)

        if (programmatic) {
          this.targetScroll = value
        }

        if (!completed) this.emit()

        if (completed) {
          this.reset()
          this.emit()
          onComplete?.(this)
          this.userData = {}
          requestAnimationFrame(() => { this.dispatchScrollendEvent() })
          this.preventNextNativeScrollEvent()
        }
      },
    })
  }

  private preventNextNativeScrollEvent() {
    this._preventNextNativeScrollEvent = true
    requestAnimationFrame(() => {
      this._preventNextNativeScrollEvent = false
    })
  }

  get rootElement() {
    return (
      this.options.wrapper === window
        ? document.documentElement
        : this.options.wrapper
    ) as HTMLElement
  }

  get limit() {
    if (this.options.naiveDimensions) {
      return this.isHorizontal
        ? this.rootElement.scrollWidth - this.rootElement.clientWidth
        : this.rootElement.scrollHeight - this.rootElement.clientHeight
    }
    return this.dimensions.limit[this.isHorizontal ? 'x' : 'y']
  }

  get isHorizontal() {
    return this.options.orientation === 'horizontal'
  }

  get actualScroll() {
    const wrapper = this.options.wrapper as Window | HTMLElement
    return this.isHorizontal
      ? ((wrapper as Window).scrollX ?? (wrapper as HTMLElement).scrollLeft)
      : ((wrapper as Window).scrollY ?? (wrapper as HTMLElement).scrollTop)
  }

  get scroll() {
    return this.animatedScroll
  }

  get progress() {
    return this.limit === 0 ? 1 : this.scroll / this.limit
  }

  get isScrolling() {
    return this._isScrolling
  }

  private set isScrolling(value: Scrolling) {
    this._isScrolling = value
  }

  get isStopped() {
    return this._isStopped
  }

  private set isStopped(value: boolean) {
    this._isStopped = value
  }

  get isLocked() {
    return this._isLocked
  }

  private set isLocked(value: boolean) {
    this._isLocked = value
  }

  get isSmooth() {
    return this.isScrolling === 'smooth'
  }
}
