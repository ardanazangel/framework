// Loop central. Arranca una vez al importar, corre siempre.
// Raf — clase para suscribir/desuscribir callbacks al loop global.

const subscribers = [];
let prevTime = null;

function loop(time) {
  requestAnimationFrame(loop);
  const delta = prevTime === null ? 0 : (time - prevTime) / 1000;
  prevTime = time;
  for (let i = 0; i < subscribers.length; i++) subscribers[i](delta, time);
}

requestAnimationFrame(loop);

export class Raf {
  constructor(fn) { this.fn = fn; }
  run()  { if (!subscribers.includes(this.fn)) subscribers.push(this.fn); }
  stop() { const i = subscribers.indexOf(this.fn); if (i !== -1) subscribers.splice(i, 1); }
}
