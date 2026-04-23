import {
  THREE,
  Raf,
  camera,
  renderer,
  scene,
} from "../core/three-engine/index.js";
import {
  Fullscreen,
  Container,
  Text,
  reversePainterSortStable,
} from "@pmndrs/uikit";
import Lenis from "lenis";

let root = null;
let scrollContainer = null;
let lenis = null;
let raf = null;
let cube = null;
let lights = [];
let cubeScene = null;

const vwd = window.innerWidth / 1920;

export const uiCard = {
  preload() {
    return [];
  },

  init() {
    renderer.localClippingEnabled = true;
    renderer.setTransparentSort(reversePainterSortStable);

    cubeScene = new THREE.Scene();
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    const dirLight = new THREE.DirectionalLight(0x3b82f6, 3);
    dirLight.position.set(3, 3, 5);
    lights = [ambient, dirLight];
    cubeScene.add(ambient, dirLight);

    cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.8, 1.8),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 1,
        metalness: 0,
      }),
    );
    cubeScene.add(cube);

    root = new Fullscreen(renderer, {
      alignItems: "center",
      justifyContent: "center",
    });
    camera.add(root);

    scrollContainer = new Container({
      flexDirection: "column",
      alignItems: "center",
      height: "200vh",
      gap: vwd * 10,
    });
    root.add(scrollContainer);

    scrollContainer.add(
      new Text({ text: "WebGL", fontSize: vwd * 12, color: "#3b82f6" }),
    );
    scrollContainer.add(
      new Text({ text: "eHealth Arena", fontSize: vwd * 12, color: "white" }),
    );
    scrollContainer.add(
      new Text({ text: "3D Showroom", fontSize: vwd * 12, color: "#64748b" }),
    );
    scrollContainer.add(
      new Text({
        text: "Interactive 3D platform exploring how e-health solutions work in practice.",
        fontSize: vwd * 12,
        color: "#94a3b8",
        wordBreak: "break-word",
      }),
    );

    const pxToWorld = window.innerHeight / renderer.domElement.clientHeight;

    lenis = new Lenis({ autoRaf: false });
    lenis.on("scroll", ({ scroll }) => {
      if (scrollContainer) scrollContainer.position.y = scroll * pxToWorld;
    });

    raf = new Raf((delta) => {
      lenis?.raf(delta * 1000);
      root.update(delta * 1000);
      cube.rotation.x += delta * 0.4;
      cube.rotation.y += delta * 0.6;
    });
    raf.run();
  },

  on() {},
  off() {},

  destroy() {
    if (raf) {
      raf.stop();
      raf = null;
    }
    if (lenis) {
      lenis.destroy();
      lenis = null;
    }
    if (scrollContainer) {
      scrollContainer.dispose?.();
      scrollContainer = null;
    }
    if (root) {
      root.dispose();
      camera.remove(root);
      root = null;
    }
    if (cube) {
      cubeScene?.remove(cube);
      cube.geometry.dispose();
      cube.material.dispose();
      cube = null;
    }
    if (lights.length) {
      cubeScene?.remove(...lights);
      lights = [];
    }
    cubeScene = null;
  },
};
