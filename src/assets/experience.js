import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";

async function initScene(canvas, { background = 'transparent' } = {}) {
  // escena
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    innerWidth / innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 5;

  // renderer
  const transparent = background === "transparent";
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: transparent,
  });
  await renderer.init();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  if (transparent) renderer.setClearColor(0x000000, 0);
  else renderer.setClearColor(background);

  // resize
  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  window.addEventListener("resize", onResize);

  // cubo
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshNormalMaterial(),
  );
  scene.add(cube);

  // loop
  const timer = new THREE.Timer();
  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    timer.update();
    const delta = timer.getDelta();
    cube.rotation.x += 0.6 * delta;
    cube.rotation.y += 0.6 * delta;
    renderer.render(scene, camera);
  }
  animate();

  function destroy() {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    renderer.dispose();
  }

  return { scene, camera, renderer, destroy };
}

const canvas = document.querySelector("canvas");
if (canvas) {
  initScene(canvas);
}
