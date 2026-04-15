import { THREE, Raf, scene } from "../core/experience.js";

let cube  = null;

const loader = new THREE.TextureLoader();

const raf = new Raf((delta) => {
  if (!cube) return;
  cube.rotation.x += 0.6 * delta;
  cube.rotation.y += 0.6 * delta;
});

export const home = {
  preload() {
    return [loader.loadAsync('/test.jpg')];
  },

  init() {
    // Three.js
    const texture = loader.load('/test.jpg');
    cube = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    scene.add(cube);

  },

  on()  { raf.run(); },
  off() {  },

  destroy() {
    if (cube) {
      scene.remove(cube);
      cube.material.map?.dispose();
      cube.material.dispose();
      cube.geometry.dispose();
      cube = null;
    }
  },
};
