import { THREE, Raf, scene } from "../core/three-engine/index.js";
import { Accordion } from "../core/accordion-engine/index.js";

let sphere    = null;
let accordion = null;
let autoplay  = null;

const raf = new Raf((delta) => {
  if (!sphere) return;
  sphere.rotation.y += 0.4 * delta;
  sphere.rotation.x += 0.2 * delta;
});

export const about = {
  init() {
    accordion = new Accordion(document.querySelector('.accordion'), { exclusive: true, activeIndex: 0 })
    accordion.init()

    let current = 0
    const total = document.querySelectorAll('.accordion-item').length

    sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 128),
      new THREE.MeshNormalMaterial({ wireframe: true }),
    );
    // scene.add(sphere);

  },

  on()  { raf.run(); },
  off() { raf.stop(); },

  destroy() {
    // accordion?.destroy()
    accordion = null

    if (sphere) {
      scene.remove(sphere);
      sphere.material.map?.dispose();
      sphere.material.dispose();
      sphere.geometry.dispose();
      sphere = null;
    }
  },
};
