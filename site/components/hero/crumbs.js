// The crumbs on her counter, and what they do when you go near them.
//
// A baker's counter is never clean, and the pour already leaves three pieces
// outside the jar. These are the rest of them: too small to be granola, spread
// wide enough to be believable, and the only thing in the scene that answers to
// the visitor rather than to the clock.
//
// They borrow the granola's own lump and its oat surface, so sixty-four more
// crumbs cost one draw call and not one byte of texture.

import * as THREE from 'three';
import { mulberry32 } from './random.js';

const COUNT = 64;
const REACH = 0.85;        // how close the cursor has to be, in counter units
const SHOVE = 3.1;         // how hard it pushes
const SPRING = 7.5;        // how firmly a crumb wants to be home again
const DRAG = 3.9;
const STILL = 0.0016;      // below this, nothing is moving and drawing can stop

/**
 * @param {object} o
 * @param {object} o.data        the baked pour, for its seed and palette
 * @param {THREE.BufferGeometry} o.geometry  the granola's lump
 * @param {THREE.Material} o.material        the granola's oat surface
 * @param {number} o.jarX        where the jar is standing
 */
export function createCrumbs({ data, geometry, material, jarX }) {
  const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
  // A crumb two centimetres across casts a shadow smaller than a pixel, so it
  // is left out of the shadow pass entirely and only catches the light.
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const palette = data.palette.map((hex) => new THREE.Color(hex).convertSRGBToLinear());
  const rnd = mulberry32((data.seed ^ 0xc7b3) >>> 0);
  const jarR = data.jar.radius + 0.1;

  const crumbs = [];
  for (let i = 0; i < COUNT; i++) {
    // Scattered across the front of the counter, but never under the jar —
    // a crumb inside the glass would be a bug, not a detail.
    let hx = 0;
    let hz = 0;
    for (let tries = 0; tries < 24; tries++) {
      hx = -2.4 + rnd() * 4.6;
      hz = -0.55 + rnd() * 2.1;
      if (Math.hypot(hx, hz) > jarR + 0.34) break;
    }

    const r = 0.018 + Math.pow(rnd(), 2.1) * 0.05;
    crumbs.push({
      hx, hz, r,
      x: hx, z: hz,
      vx: 0, vz: 0,
      wx: 0.8 + rnd() * 0.5,
      wy: 0.4 + rnd() * 0.34,     // squat, because they are lying down
      wz: 0.8 + rnd() * 0.5,
      euler: new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28),
      roll: 0,
      colour: palette[rnd() < 0.4 ? 2 : rnd() < 0.6 ? 3 : 1],
    });
    mesh.setColorAt(i, crumbs[i].colour);
  }
  mesh.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();
  const spin = new THREE.Quaternion();
  const rest = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let centre = jarX;
  let moving = false;

  function write() {
    for (let i = 0; i < COUNT; i++) {
      const c = crumbs[i];
      rest.setFromEuler(c.euler);
      spin.setFromAxisAngle(up, c.roll);
      spin.multiply(rest);

      dummy.position.set(centre + c.x, c.r * c.wy, c.z);
      dummy.quaternion.copy(spin);
      dummy.scale.set(c.r * c.wx, c.r * c.wy, c.r * c.wz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  write();

  return {
    mesh,
    get moving() { return moving; },

    recentre(x) {
      centre = x;
      write();
    },

    /**
     * The cursor has arrived at a point on the counter. Everything close enough
     * is shoved away from it, hardest at the middle of the reach.
     *
     * @param {number} px  world x
     * @param {number} pz  world z
     */
    shove(px, pz) {
      const lx = px - centre;
      let touched = false;
      for (const c of crumbs) {
        const dx = c.x - lx;
        const dz = c.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > REACH) continue;

        // Right on top of a crumb the direction is meaningless, so give it one.
        const nx = d > 1e-4 ? dx / d : Math.cos(c.hx * 9);
        const nz = d > 1e-4 ? dz / d : Math.sin(c.hz * 9);
        const push = (1 - d / REACH) * SHOVE;
        c.vx += nx * push;
        c.vz += nz * push;
        touched = true;
      }
      if (touched) moving = true;
      return touched;
    },

    /**
     * Let a moment pass. Returns true while anything is still out of place, so
     * the scene knows whether it owes another frame.
     */
    step(dt) {
      if (!moving) return false;

      // A long stall — a background tab, usually — must not fling anything
      // across the counter when it comes back.
      const h = Math.min(dt, 0.05);
      let busy = false;

      for (const c of crumbs) {
        const ox = c.x - c.hx;
        const oz = c.z - c.hz;
        c.vx += (-SPRING * ox - DRAG * c.vx) * h;
        c.vz += (-SPRING * oz - DRAG * c.vz) * h;
        c.x += c.vx * h;
        c.z += c.vz * h;
        // A crumb that slides also turns, which is the whole difference between
        // scattering and sliding on ice.
        c.roll += (c.vx * 0.9 - c.vz * 0.6) * h * 4;

        if (Math.abs(ox) > STILL || Math.abs(oz) > STILL ||
            Math.abs(c.vx) > STILL || Math.abs(c.vz) > STILL) {
          busy = true;
        } else {
          c.x = c.hx; c.z = c.hz; c.vx = 0; c.vz = 0;
        }
      }

      write();
      moving = busy;
      return busy;
    },

    dispose() {
      mesh.dispose();
    },
  };
}
