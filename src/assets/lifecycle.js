export const emit = (name, detail = null) =>
  document.dispatchEvent(new CustomEvent(name, { detail }));

export const on = (name, fn) =>
  document.addEventListener(name, (e) => fn(e.detail));
