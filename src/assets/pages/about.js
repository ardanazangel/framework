import { THREE, setScene } from "../experience.js";
import { Raf } from "../raf.js";

let scene  = null;
let sphere = null;

const raf = new Raf((delta) => {
  if (!sphere) return;
  sphere.rotation.y += 0.4 * delta;
  sphere.rotation.x += 0.2 * delta;
});

export const about = {
  init() {
    scene  = new THREE.Scene();
    sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshNormalMaterial({ wireframe: true }),
    );
    scene.add(sphere);
    setScene(scene);
  },

  on()  { raf.run(); },
  off() { raf.stop(); },

  destroy() {
    sphere.geometry.dispose();
    sphere.material.dispose();
    sphere = null;
    scene  = null;
  },
};
