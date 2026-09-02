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
 * this scene started and is still the default — `dawn` reproduces the original
 * lighting exactly, so the hour can always be wound back to it. The rest are
 * here because the light following the visitor's own hour costs one angle, one
 * colour and one exposure.
 *
 * Evening comes in from the right, because a sun that set on the same side it
 * rose is the sort of thing you cannot unsee. Night is not the sun at all: it
 * is the one bulb over her counter, close and warm and much dimmer, which is
 * why its exposure drops rather than only its intensity.
 */
export const HOURS = {
  dawn: { colour: '#ffe6b8', at: [-4.2, 3.4, 2.6], power: 3.6, sky: '#fff2d8', ground: '#7a5228', bounce: 0.6, fill: 0.55, env: 1, exposure: 1.06 },
  noon: { colour: '#fff6e6', at: [-1.2, 6.2, 2.2], power: 3.9, sky: '#fffaf0', ground: '#8a6236', bounce: 0.75, fill: 0.7, env: 1.1, exposure: 1.04 },
  evening: { colour: '#ffc07a', at: [4.4, 2.1, 2.2], power: 3.1, sky: '#ffe2bd', ground: '#6a431f', bounce: 0.46, fill: 0.34, env: 0.68, exposure: 0.96 },
  night: { colour: '#ffd08a', at: [-1.1, 2.6, 1.1], power: 1.9, sky: '#c9ad84', ground: '#2a1a0c', bounce: 0.22, fill: 0.1, env: 0.26, exposure: 0.7 },
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
  let hour = 'dawn';
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

  // The hero is as tall as its own headline, and the headline is set in a font
  // that arrives after the page does. On a first visit the scene is therefore
  // built against the fallback and the canvas grows underneath it a moment
  // later — leaving the render stretched, and only on the visit that matters
  // most. Watching the canvas itself catches that, and every other reason the
  // box might change that a window resize would miss.
  const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measure()) : null;
  watch?.observe(canvas);

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
     * Move the sun. One angle, one colour and one exposure, so the shop is lit
     * by the hour the visitor happens to be looking at it.
     *
     * Exposure and the environment are what make night read as night: dimming
     * the lamps alone leaves the kitchen reflected in everything and the room
     * stays stubbornly bright at two in the morning.
     */
    setHour(name) {
      const h = HOURS[name];
      if (!h) return false;
      key.color.set(h.colour);
      key.intensity = h.power;
      key.position.set(h.at[0], h.at[1], h.at[2]);
      fill.intensity = h.fill;
      bounce.color.set(h.sky);
      bounce.groundColor.set(h.ground);
      bounce.intensity = h.bounce;
      scene.environmentIntensity = h.env;
      renderer.toneMappingExposure = h.exposure;
      hour = name;
      return true;
    },

    get hour() { return hour; },

    dispose() {
      disposed = true;
      window.removeEventListener('resize', measure);
      watch?.disconnect();
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
