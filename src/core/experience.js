import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { state } from "./app.js";
import { Raf } from "./raf.js";

export { THREE, Raf };

// 👉 cámara compartida
export const camera = new THREE.PerspectiveCamera(75, state.win.wh, 0.1, 1000);
camera.position.z = 5;

// 👉 escena compartida (singleton real)
export const scene = new THREE.Scene();

// 👉 renderer
export let renderer = null;

// 👉 RAF loop
const raf = new Raf(() => {
  renderer?.render(scene, camera);
});

export async function initExperience() {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;

  renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true });
  await renderer.init();

  renderer.setSize(state.win.w, state.win.h);
  renderer.setPixelRatio(state.win.dpr);
  renderer.setClearColor(0x000000, 0);

  raf.run();

  let resizeTimeout;

  window.addEventListener("win:resize", ({ detail: win }) => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      camera.aspect = win.wh;
      camera.updateProjectionMatrix();
      renderer.setSize(win.w, win.h);
    }, 100);
  });
}
