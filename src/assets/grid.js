class GridLayout extends HTMLElement {
  static observedAttributes = ['count']

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
  }

  attributeChangedCallback() {
    this.render()
  }

  render() {
    const count = parseInt(this.getAttribute('count')) || 0

    const wrap = document.createElement('div')
    wrap.className = 'grid-wrapper'
    for (let i = 0; i < count; i++) {
      const col = document.createElement('div')
      col.className = 'grid-column'
      wrap.append(col)
    }

    const style = document.createElement('style')
    style.textContent = /*css*/`
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        pointer-events: none;
      }
      .grid-wrapper {
        display: flex;
        position: fixed;
        z-index: 100;
        width: 100vw;
        height: 100vh;
        gap: 1em;
        padding: 2em;
        transition: opacity 0.2s ease;
        opacity: 0;
      }
      .grid-column {
        background: red;
        opacity: 0.1;
        width: 100%;
      }
    `

    this.shadowRoot.innerHTML = ''
    this.shadowRoot.append(style, wrap)
  }
}

customElements.define('grid-layout', GridLayout)

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'G') {
    document.querySelectorAll('grid-layout').forEach((el) => {
      const wrap = el.shadowRoot.querySelector('.grid-wrapper')
      wrap.style.opacity = wrap.style.opacity === '1' ? '0' : '1'
    })
  }
})
