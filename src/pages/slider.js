import { Slider } from '../core/slider-engine/index.js'
import { Raf } from '../core/raf.js'

let core = null
let raf = null

export const slider = {
  init() {
    const wrapper = document.querySelector('[data-slider]')
    if (!wrapper) return

    core = new Slider(wrapper, {
      infinite: false,
      snap: false,
      lerpFactor: 0.3,
      onUpdate(s) {
        s.parallaxValues.forEach((v, i) => {
          const pv = s.items[i].querySelector('[data-pv]')
          if (pv) pv.textContent = v.toFixed(2)
        })
        console.log(s.parallaxValues.map(v => v.toFixed(2)))
      },
    })

    core.init()

    document.querySelector('[data-prev]')?.addEventListener('click', () => core.goToPrev())
    document.querySelector('[data-next]')?.addEventListener('click', () => core.goToNext())

    raf = new Raf(() => core.update())
  },

  on() { raf?.run() },
  off() { raf?.stop() },

  destroy() {
    setTimeout(()=>{
            core?.destroy()
    core = null
    raf = null
    },1000)

  },
}
