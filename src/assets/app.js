function getWin() {
  const w = innerWidth
  const h = innerHeight
  return {
    w, h,
    hw: h / w,
    wh: w / h,
    semi: { w: w * 0.5, h: h * 0.5 },
    dpr: devicePixelRatio,
    isLandscape: w > h,
    isMobile: w <= 768,
  }
}

export const state = {
  route: {
    current: null,
    previous: null,
  },
  scroll: 0,
  win: getWin(),
}

window.addEventListener('resize', () => {
  state.win = getWin()
  window.dispatchEvent(new CustomEvent('win:resize', { detail: state.win }))
})

// Hooks de lifecycle — callbacks directos, sin pub/sub.
// El router los llama, entry-client.js los asigna.
export const hooks = {
  beforeInsert: null, // ({ path, el }) => void
  mount:        null, // ({ path })      => void
  destroy:      null, // ({ path })      => void
}
