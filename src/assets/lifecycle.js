const listeners = {}

export const emit = (name, detail) =>
  listeners[name]?.forEach(fn => fn(detail))

export const on = (name, fn) =>
  (listeners[name] ??= []).push(fn)
