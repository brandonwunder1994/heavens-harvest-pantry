// The warmth coming off a batch that has just gone into the jar.
//
// It is deliberately a recording, like the pour it sits on top of: every puff
// is a function of the scene clock and nothing else. That keeps two promises at
// once — the same screenshot at the same second, every time, and a hero that
// stops drawing when it is finished instead of running a loop on someone's
// phone for as long as they are on the page.
//
// It starts as the first granola lands and is gone within a few seconds.

import * as THREE from 'three';
import { steamTexture } from './textures.js';
import { mulberry32 } from './random.js';

const PUFFS = 12;
const LIFE = 2.9;          // seconds from nothing to nothing
const GAP = 0.30;          // seconds between one puff and the next
const PEAK = 0.32;         // the most solid a puff ever gets

// A note on why this is not additive. Adding light to a cream wall that is
// already nearly white cannot make a plume — it makes two bright dots that read
// as a lens flare over the jar. Steam is not a light source; it is something
// you see *through*. So each puff is genuinely translucent, and the fade is in
// its alpha.

/**
 * @param {object} o
 * @param {object} o.data       the baked pour, for its timings and the jar
 * @param {number} o.jarX       where the jar is standing
 */
export function createSteam({ data, jarX }) {
  const map = steamTexture();
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    color: '#fdf4e4',
    toneMapped: false,
  });

  // One instanced mesh can only vary colour per puff, never opacity — so the
  // per-instance colour is read as an opacity instead. Two lines of shader,
  // and the alternative is sixteen separate meshes.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      'diffuseColor.a *= vColor.r;',
    );
  };

  const mesh = new THREE.InstancedMesh(geometry, material, PUFFS);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;

  // The mouth of the jar, which is where warm air would actually leave it.
  const MOUTH = 1.60;
  const first = data.timing.pour * 0.35;

  const rnd = mulberry32((data.seed ^ 0x51ea) >>> 0);
  const puffs = [];
  for (let i = 0; i < PUFFS; i++) {
    puffs.push({
      born: first + i * GAP,
      x: (rnd() - 0.5) * 0.3,
      z: (rnd() - 0.5) * 0.26,
      drift: (rnd() - 0.5) * 0.34,
      rise: 0.34 + rnd() * 0.26,
      size: 0.34 + rnd() * 0.24,
      grow: 1.4 + rnd() * 0.8,
      turn: (rnd() - 0.5) * 1.1,
      // The last few are weaker, so the warmth tails off rather than stopping.
      strength: i < PUFFS - 5 ? 1 : 1 - (i - (PUFFS - 6)) / 6,
    });
  }

  const tint = new THREE.Color();
  const dummy = new THREE.Object3D();
  let centre = jarX;

  /** Whether any puff is still on screen at `t`. */
  function alive(t) {
    return t >= first && t < puffs[PUFFS - 1].born + LIFE;
  }

  return {
    mesh,
    get lastMoment() { return puffs[PUFFS - 1].born + LIFE; },
    alive,

    recentre(x) {
      centre = x;
    },

    /**
     * Put every puff where it is at `t` seconds. Puffs face the camera, so the
     * camera has to be handed in rather than remembered — the frame changes
     * shape and the camera moves with it.
     */
    place(t, camera) {
      for (let i = 0; i < PUFFS; i++) {
        const p = puffs[i];
        const age = (t - p.born) / LIFE;

        if (age < 0 || age >= 1) {
          dummy.scale.set(0, 0, 0);
          dummy.position.set(0, -10, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          mesh.setColorAt(i, tint.setScalar(0));
          continue;
        }

        // In quickly, out slowly — warm air is brightest just above the jar and
        // thins as it spreads.
        const fade = Math.sin(Math.PI * Math.pow(age, 0.72));
        const lift = age * age * (3 - 2 * age);

        dummy.position.set(
          centre + p.x + p.drift * lift,
          MOUTH + p.rise * lift * 1.35,
          p.z,
        );
        dummy.quaternion.copy(camera.quaternion);
        dummy.rotateZ(p.turn * lift);
        const s = p.size * (1 + p.grow * lift);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        mesh.setColorAt(i, tint.setScalar(PEAK * fade * p.strength));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },

    dispose() {
      geometry.dispose();
      material.dispose();
      map.dispose();
      mesh.dispose();
    },
  };
}
