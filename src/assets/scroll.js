import { Lenis } from "./lenis/lenis.ts"
import { state } from "./app.js"

export const lenis = new Lenis({ autoRaf: true, lerp: 0.09 })

const scrollState = { scroll: 0, velocity: 0, direction: 0, progress: 0 }

lenis.on('scroll', ({ scroll, velocity, direction, progress }) => {
  scrollState.scroll = scroll
  scrollState.velocity = velocity
  scrollState.direction = direction
  scrollState.progress = progress
  state.scroll = scroll
  window.dispatchEvent(new CustomEvent('lenis:scroll', { detail: scrollState }))
})

function handleKeydown(e) {
  if (e.target.closest('input, textarea, select')) return

  let delta = 0
  if (e.code === 'ArrowDown' || e.code === 'ArrowRight') delta = 100
  else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') delta = -100
  else if (e.code === 'Space') delta = (window.innerHeight - 40) * (e.shiftKey ? -1 : 1)
  else return

  e.preventDefault()
  lenis.scrollTo(lenis.scroll + delta)
}

window.addEventListener('transition:end', () => {
  lenis.scrollTo(0, { immediate: true })
})

export const scroll = {
  on()  { document.addEventListener('keydown', handleKeydown) },
  off() { document.removeEventListener('keydown', handleKeydown) },
}
