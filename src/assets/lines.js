import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

function splitContainer(container) {
  const text = container.textContent.trim()
  if (!text) return

  const style = getComputedStyle(container)
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`.trim()
  const lineHeight = parseFloat(style.lineHeight)
  const maxWidth = container.clientWidth

  const prepared = prepareWithSegments(text, font)
  const { lines } = layoutWithLines(prepared, maxWidth, lineHeight)

  container.innerHTML = ''
  for (const line of lines) {
    const inner = document.createElement('span')
    inner.className = 'line-inner'
    inner.textContent = line.text
    const wrap = document.createElement('span')
    wrap.className = 'line'
    wrap.appendChild(inner)
    container.appendChild(wrap)
  }
}

function apply(selector) {
  document.querySelectorAll(selector).forEach(splitContainer)
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
