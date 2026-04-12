import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { state } from "./app.js";
import { Raf } from "./raf.js";

export { THREE, Raf };
export const camera = new THREE.PerspectiveCamera(75, state.win.wh, 0.1, 1000);
camera.position.z = 5;

export let renderer = null;

let _scene = null;
export function setScene(scene) { _scene = scene; }

const raf = new Raf(() => { if (_scene) renderer?.render(_scene, camera); });

export async function initExperience() {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;

  renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true });
  await renderer.init();
  renderer.setSize(state.win.w, state.win.h);
  renderer.setPixelRatio(state.win.dpr);
  renderer.setClearColor(0x000000, 0);

  raf.run();

  window.addEventListener("win:resize", ({ detail: win }) => {
    camera.aspect = win.wh;
    camera.updateProjectionMatrix();
    renderer.setSize(win.w, win.h);
  });
}
