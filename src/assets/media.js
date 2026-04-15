let observer

function init() {
  const elements = document.querySelectorAll("img[loading='lazy'], video[loading='lazy']")

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target
        observer.unobserve(el)
        const isVideo = el.tagName === 'VIDEO'
        const isReady = isVideo ? el.readyState >= 2 : el.complete
        if (isReady) {
          el.classList.add("loaded")
        } else {
          const evt = isVideo ? "loadeddata" : "load"
          el.addEventListener(evt, () => el.classList.add("loaded"), { once: true })
          el.addEventListener("error", () => el.classList.add("loaded"), { once: true })
        }
      })
    },
    { rootMargin: "0px 0px 0px 0px", threshold: 0 }
  )

  elements.forEach((el) => observer.observe(el))
}

export const media = {
  on() {
    observer?.disconnect()
    init()
  },
  off() {
    observer?.disconnect()
  },
}
