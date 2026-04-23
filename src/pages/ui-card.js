import { THREE, camera, scene, addPreRender, removePreRender } from "../core/three-engine/index.js";
import { MSDFText, loadFont, layoutLetters } from "../core/three-engine/msdf-text.js";

const vph = 2 * Math.tan((camera.fov / 2) * (Math.PI / 180)) * camera.position.z;
const vpw = vph * (window.innerWidth / window.innerHeight);

let font        = null;
let scrollGroup = null;
let meshes      = [];
let preRenderFn = null;
let elapsed     = 0;

export const uiCard = {
  preload() {
    return [loadFont("/fonts/nmb.json").then((f) => { font = f })];
  },

  init() {
    const fontSize = vpw * 0.2;

    const a = new MSDFText("A", font, { fontSize, color: "#3b82f6" });
    const r = new MSDFText("R", font, { fontSize, color: "#3b82f6" });
    const o = new MSDFText("O", font, { fontSize, color: "#3b82f6" });
    const c = new MSDFText("C", font, { fontSize, color: "#3b82f6" });
    const k = new MSDFText("K", font, { fontSize, color: "#3b82f6" });

    layoutLetters([a, r, o, c, k], 0.92);

    scrollGroup = new THREE.Group();
    scrollGroup.add(a, r, o, c, k);
    scene.add(scrollGroup);
    meshes = [a, r, o, c, k];

    const amp   = fontSize * 0.3;
    const speed = 1.5;
    const phase = (Math.PI * 2) / meshes.length;

    preRenderFn = (delta) => {
      elapsed += delta;
      meshes.forEach((m, i) => {
        m.position.y = Math.sin(elapsed * speed + i * phase) * amp;
      });
    };
    addPreRender(preRenderFn);
  },

  on()  {},
  off() {},

  destroy() {
    if (preRenderFn) { removePreRender(preRenderFn); preRenderFn = null; }
    elapsed = 0;
    if (scrollGroup) {
      scene.remove(scrollGroup);
      meshes.forEach((m) => m.dispose());
      meshes      = [];
      scrollGroup = null;
    }
  },
};
