const listeners = {}

export const emit = (name, detail) => {
  listeners[name]?.forEach(fn => fn(detail))
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export const on = (name, fn) =>
  (listeners[name] ??= []).push(fn)
