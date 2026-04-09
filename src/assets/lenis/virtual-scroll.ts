import { Emitter } from './emitter'
import type { VirtualScrollCallback } from './types'

const LINE_HEIGHT = 100 / 6
const listenerOptions: AddEventListenerOptions = { passive: false }

function getDeltaMultiplier(deltaMode: number, size: number): number {
  if (deltaMode === 1) return LINE_HEIGHT
  if (deltaMode === 2) return size
  return 1
}

export class VirtualScroll {
  window = { width: 0, height: 0 }
  private emitter = new Emitter()

  constructor(
    private element: HTMLElement,
    private options = { wheelMultiplier: 1 }
  ) {
    window.addEventListener('resize', this.onWindowResize)
    this.onWindowResize()
    this.element.addEventListener('wheel', this.onWheel, listenerOptions)
  }

  on(event: string, callback: VirtualScrollCallback) {
    return this.emitter.on(event, callback as (...args: unknown[]) => void)
  }

  destroy() {
    this.emitter.destroy()
    window.removeEventListener('resize', this.onWindowResize)
    this.element.removeEventListener('wheel', this.onWheel, listenerOptions)
  }

  onWheel = (event: WheelEvent) => {
    let { deltaX, deltaY, deltaMode } = event

    deltaX *= getDeltaMultiplier(deltaMode, this.window.width) * this.options.wheelMultiplier
    deltaY *= getDeltaMultiplier(deltaMode, this.window.height) * this.options.wheelMultiplier

    this.emitter.emit('scroll', { deltaX, deltaY, event })
  }

  onWindowResize = () => {
    this.window = { width: window.innerWidth, height: window.innerHeight }
  }
}
