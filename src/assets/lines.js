import { splitLines } from './split-lines.js'
import { on } from './lifecycle.js'

function apply(selector) {
  splitLines([...document.querySelectorAll(selector)])
  document.querySelectorAll('.line-inner').forEach((el, i) => {
    setTimeout(() => el.classList.add('on'), i * 20)
  })
}

// Primera carga — espera a que las fuentes estén listas
document.fonts.ready.then(() => apply('.lines'))

export const lines = {
  on()  { apply('.page .lines') },
  off() {},
}
