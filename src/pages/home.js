import {
  THREE,
  Raf,
  scene,
  camera,
  renderer,
} from "../core/three-engine/index.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let controls = null;
let plane = null;

const raf = new Raf(() => {
  plane.rotation.x += 0.01;
  plane.rotation.y += 0.01;

  controls?.update();
});

export const home = {
  preload() {
    return [];
  },

  init() {
    plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }),
    );
    scene.add(plane);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    raf.run();
  },

  on() {},
  off() {},

  destroy() {
    raf.stop();
    controls?.dispose();
    controls = null;

    if (!plane) return;
    scene.remove(plane);
    plane.material.dispose();
    plane.geometry.dispose();
    plane = null;
  },
};
