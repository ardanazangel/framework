// Utilidades matemáticas compartidas

// Lambda compartido entre scroll engine y slider engine.
// Cambia este valor para afectar el feel de ambos a la vez.
export const LAMBDA = 6

// Interpolación suave frame-rate independent.
// lambda: 1/lerpFactor — a mayor valor, más rápido converge.
// Idéntica a la de smooothy y a la del scroll engine.
export function damp(a, b, lambda, dt) {
  return a + (b - a) * (1 - Math.exp(-lambda * dt))
}

// Devuelve el offset más corto de `value` dentro de [-base/2, base/2).
// Usada en el slider engine para posicionar slides en modo infinite.
export function symmetricMod(value, base) {
  let m = value % base
  if (Math.abs(m) > base / 2) m = m > 0 ? m - base : m + base
  return m
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
