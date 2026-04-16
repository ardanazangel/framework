import { THREE, Raf, scene } from "../core/three-engine/index.js";

let sphere = null;

const raf = new Raf((delta) => {
  if (!sphere) return;
  sphere.rotation.y += 0.4 * delta;
  sphere.rotation.x += 0.2 * delta;
});

export const about = {
  init() {
    sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 128),
      new THREE.MeshNormalMaterial({ wireframe: true }),
    );
    scene.add(sphere);

  },

  on()  { raf.run(); },
  off() { raf.stop(); },

  destroy() {
    if (sphere) {
      scene.remove(sphere);
      sphere.material.map?.dispose();
      sphere.material.dispose();
      sphere.geometry.dispose();
      sphere = null;
    }
  },
};
