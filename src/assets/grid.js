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
`
document.head.appendChild(style)

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

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'G') toggleGrid()
})
