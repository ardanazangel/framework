import { detect } from "./utils/detect.js"

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
    isMobile: detect.isMobile,
  }
}

export const state = {
  route: {
    current: null,
    previous: null,
  },
  // Flags semánticos por tipo de página — actualizados por el router
  // is.home = true mientras home es la página activa
  // was.home = true si home fue la página anterior (se limpia en cada navegación)
  is: {},
  was: {},
  scroll: 0,
  win: getWin(),
}

window.addEventListener('resize', () => {
  state.win = getWin()
  window.dispatchEvent(new CustomEvent('win:resize', { detail: state.win }))
})

export const hooks = {
  beforeInsert: null, // ({ path, el }) => void
  mount: null, // ({ path })      => void
  destroy: null, // ({ path })      => void
}
