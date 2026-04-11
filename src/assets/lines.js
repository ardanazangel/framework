import { splitLines } from './split-lines.js'

function apply(selector) {
  splitLines([...document.querySelectorAll(selector)])
  document.querySelectorAll('.line-inner').forEach((el, i) => {
    setTimeout(() => el.classList.add('on'), i * 20)
  })
}

let fontsReady = false

export const lines = {
  on() {
    if (!fontsReady) {
      document.fonts.ready.then(() => {
        fontsReady = true
        apply('.page .lines')
      })
    } else {
      apply('.page .lines')
    }
  },
  off() {},
}
