const style = document.createElement('style')
style.textContent = /*css*/`
  #grid-overlay {
    position: fixed;
    z-index: 9999;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    padding: calc(var(--vw) * 32);
    gap: calc(var(--vw) * 16);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  #grid-overlay.on {
    opacity: 1;
  }
  #grid-overlay > div {
    flex: 1;
    height: 100%;
    background: red;
    opacity: 0.1;
  }

  #crosshair-h,
  #crosshair-v {
    position: fixed;
    z-index: 10000;
    pointer-events: none;
    background: rgba(0, 120, 255, 0.35);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  #crosshair-h {
    top: 50%;
    left: 0;
    width: 100%;
    height: 2px;
  }
  #crosshair-v {
    top: 0;
    left: 50%;
    height: 100%;
    width: 2px;
  }
  #crosshair-h.on,
  #crosshair-v.on {
    opacity: 1;
  }
`
document.head.appendChild(style)

/* ── Grid ── */
let overlay = null

function addGrid(cols = 12) {
  overlay = document.createElement('div')
  overlay.id = 'grid-overlay'
  for (let i = 0; i < cols; i++) {
    overlay.appendChild(document.createElement('div'))
  }
  document.body.prepend(overlay)
}

function toggleGrid() {
  if (!overlay) addGrid()
  overlay.classList.toggle('on')
}

/* ── Crosshair ── */
let crosshairH = null
let crosshairV = null
function addCrosshair() {
  crosshairH = document.createElement('div')
  crosshairH.id = 'crosshair-h'
  crosshairV = document.createElement('div')
  crosshairV.id = 'crosshair-v'
  document.body.appendChild(crosshairH)
  document.body.appendChild(crosshairV)
}

function toggleCrosshair() {
  if (!crosshairH) addCrosshair()
  crosshairH.classList.toggle('on')
  crosshairV.classList.toggle('on')
}

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'G') toggleGrid()
  if (e.shiftKey && e.key === 'X') toggleCrosshair()
})
