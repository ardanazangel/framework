const listeners = {}

export const emit = (name, detail) => {
  listeners[name]?.forEach(fn => fn(detail))
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export const on = (name, fn) =>
  (listeners[name] ??= []).push(fn)

export const off = (name, fn) => {
  if (!listeners[name]) return
  listeners[name] = listeners[name].filter(f => f !== fn)
}
