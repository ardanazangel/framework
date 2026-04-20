import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { state } from "../app.js";
import { Raf } from "../utils/raf.js";

export { THREE, Raf };

export const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.z = 5;

export const scene = new THREE.Scene();
export let renderer = null;

const raf = new Raf(() => {
  renderer?.render(scene, camera);
});

export async function initExperience() {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "fixed", width: "100vw", height: "100vh", top: "0", left: "0", zIndex: "1" });
  document.body.appendChild(canvas);

  renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true });
  await renderer.init();

  renderer.setPixelRatio(state.win.dpr);
  renderer.setClearColor(0x000000, 0);

  resize(state.win);
  raf.run();

  window.addEventListener("win:resize", ({ detail: win }) => resize(win));
}

function resize(win) {
  camera.aspect = win.wh;
  camera.updateProjectionMatrix();
  renderer.setSize(win.w, win.h);
}
