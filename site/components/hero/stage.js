// The counter, the light and the camera — the room everything else stands in.
//
// This was the first half of pour.js. It is on its own now because the pour is
// only the first thing that happens on this counter: the same room lights the
// jar you can turn, the flavour that changes in the glass, and the walk through
// her kitchen. Building it twice would mean two rooms that drift apart.
//
//   const stage = createStage({ canvas });
//   stage.scene.add(something);
//   stage.draw();
//
// Nothing here knows about granola.

import * as THREE from 'three';
import { backdropTexture, kitchenEnvironment, woodTexture } from './textures.js';

/** The jar sits right of centre on a wide screen; the words go to its left. */
export const JAR_X = 0.86;
const LOOK_AT = new THREE.Vector3(0.12, 0.78, 0);

/**
 * The hours of her day, as light.
 *
 * Six in the morning is low and gold and rakes in from the left, which is where
 * this scene started and is still the default. The rest are here because the
 * light following the visitor's own hour costs one angle and one colour.
 */
export const HOURS = {
  dawn: { colour: '#ffe6b8', at: [-4.2, 3.4, 2.6], power: 3.6, sky: '#fff2d8', ground: '#7a5228', bounce: 0.6 },
  noon: { colour: '#fff6e6', at: [-1.2, 6.2, 2.2], power: 3.9, sky: '#fffaf0', ground: '#8a6236', bounce: 0.75 },
  evening: { colour: '#ffc98a', at: [4.0, 2.4, 2.4], power: 3.2, sky: '#ffe2bd', ground: '#6a431f', bounce: 0.5 },
  night: { colour: '#ffd9a0', at: [-1.6, 3.0, 1.4], power: 2.1, sky: '#e8cfa6', ground: '#3d2712', bounce: 0.34 },
};

export function createStage({ canvas }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = backdropTexture();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 1.18, 4.35);
  camera.lookAt(LOOK_AT);

  // --- light -----------------------------------------------------------------
  // Low and warm, raking in from the left, the way a kitchen window behaves
  // at six in the morning.
  const key = new THREE.DirectionalLight('#ffe6b8', 3.6);
  key.position.set(-4.2, 3.4, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3.5;
  key.shadow.camera.right = 3.5;
  key.shadow.camera.top = 3.5;
  key.shadow.camera.bottom = -1.5;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0016;
  key.shadow.radius = 3;
  scene.add(key);

  const fill = new THREE.DirectionalLight('#fff4e0', 0.55);
  fill.position.set(3.4, 2.2, 3.2);
  scene.add(fill);

  const bounce = new THREE.HemisphereLight('#fff2d8', '#7a5228', 0.6);
  scene.add(bounce);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(kitchenEnvironment()).texture;
  scene.environment = env;

  // --- the counter -----------------------------------------------------------
  const wood = woodTexture();
  const counterMat = new THREE.MeshStandardMaterial({
    map: wood,
    color: '#9a7c58',
    roughness: 0.74,
    metalness: 0,
  });
  const counterGeo = new THREE.PlaneGeometry(26, 26);
  const counter = new THREE.Mesh(counterGeo, counterMat);
  counter.rotation.x = -Math.PI / 2;
  counter.receiveShadow = true;
  scene.add(counter);

  // A plain wall a little way back. Without it the empty half of the jar has
  // nothing to refract and reads as milky plastic.
  const wallGeo = new THREE.PlaneGeometry(30, 14);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e7d6b6', roughness: 0.95, metalness: 0 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 6.4, -4.6);
  wall.receiveShadow = true;
  scene.add(wall);

  // --- the shape of the frame ------------------------------------------------
  let narrow = false;
  const listeners = [];
  let disposed = false;

  function measure() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    // On a narrow screen there is no room beside the jar for a headline, so the
    // words go underneath: the jar is centred, lifted into the top half of the
    // frame, and the camera pulls back far enough to hold all of it.
    narrow = w / h < 1;
    camera.position.set(0, narrow ? 1.55 : 1.18, narrow ? 6.6 : 4.35);
    camera.lookAt(narrow ? new THREE.Vector3(0, 0.42, 0) : LOOK_AT);
    camera.updateProjectionMatrix();

    for (const fn of listeners) fn({ narrow, jarX: narrow ? 0 : JAR_X, width: w, height: h });
  }

  window.addEventListener('resize', measure);

  return {
    renderer,
    scene,
    camera,
    get narrow() { return narrow; },

    /** Called whenever the frame changes shape, and once at the start. */
    onResize(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },

    measure,
    draw() {
      if (!disposed) renderer.render(scene, camera);
    },

    /**
     * Move the sun. One angle and one colour, so the shop is lit by the hour
     * the visitor happens to be looking at it.
     */
    setHour(name) {
      const h = HOURS[name];
      if (!h) return false;
      key.color.set(h.colour);
      key.intensity = h.power;
      key.position.set(h.at[0], h.at[1], h.at[2]);
      bounce.color.set(h.sky);
      bounce.groundColor.set(h.ground);
      bounce.intensity = h.bounce;
      return true;
    },

    dispose() {
      disposed = true;
      window.removeEventListener('resize', measure);
      listeners.length = 0;
      counterGeo.dispose();
      counterMat.dispose();
      wood.dispose();
      wallGeo.dispose();
      wallMat.dispose();
      scene.background?.dispose?.();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
