import { THREE, Raf, setScene } from "../experience.js";

let scene  = null;
let cube   = null;

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
    scene = new THREE.Scene();

    // la textura ya está en caché — load() es síncrono aquí
    const texture = loader.load('/test.jpg');
    cube = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    scene.add(cube);
    setScene(scene);
  },

  on()  { raf.run(); },
  off() { raf.stop(); },

  destroy() {
    if (cube) {
      scene.remove(cube);
      cube.material.map?.dispose();
      cube.material.dispose();
      cube.geometry.dispose();
      cube = null;
    }
    scene = null;
  },
};
