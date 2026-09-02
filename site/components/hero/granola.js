// The granola: four hundred clusters, and where each one is at any moment.
//
// The resting pile was worked out once by bake.mjs and is read from pour.json.
// Everything cosmetic — the scatter of the stream, the spin, the squash on
// landing, which shade of toast each piece is — is regenerated here from the
// same seed, so it looks identical on every visit without any of it being sent
// over the wire.
//
// Lifted out of pour.js unchanged.

import * as THREE from 'three';
import { oatTexture } from './textures.js';
import { mulberry32 } from './random.js';
import { JAR_X } from './stage.js';

/**
 * Every cluster, and where each one is at any moment.
 *
 * One instanced mesh draws all four hundred at the cost of about one, which is
 * the whole reason a phone can hold this scene at all.
 */
export function createGranola({ data }) {
  const geometry = clusterGeometry();
  const oat = oatTexture();
  const material = new THREE.MeshStandardMaterial({
    map: oat,
    roughnessMap: oat,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.7,
  });

  const total = data.count + data.spill.length / 4;
  const mesh = new THREE.InstancedMesh(geometry, material, total);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const palette = data.palette.map((hex) => new THREE.Color(hex).convertSRGBToLinear());
  const clusters = buildClusters(data, palette);
  for (let i = 0; i < clusters.length; i++) mesh.setColorAt(i, clusters[i].color);
  mesh.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();
  const axis = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const baseQuat = new THREE.Quaternion();

  return {
    mesh,
    clusters,
    // Lent to the crumbs, so sixty-four more pieces on the counter cost one
    // draw call and no new texture.
    geometry,
    material,

    /** Move the whole pile sideways, when the frame changes shape. */
    recentre(x) {
      for (const c of clusters) c.recentre(x);
    },

    /** Put every cluster where it is at `t` seconds into the pour. */
    place(t) {
      for (let i = 0; i < clusters.length; i++) {
        const c = clusters[i];
        const local = t - c.t0;

        if (local < 0) {
          dummy.scale.set(0, 0, 0);
          dummy.position.set(c.sx, c.sy, c.sz);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        let x, y, z;
        let squash = 1;

        if (local < c.tf) {
          // falling — horizontal drift eases, vertical accelerates under gravity
          const u = local / c.tf;
          const e = u * u * (3 - 2 * u);
          x = c.sx + (c.fx - c.sx) * e;
          z = c.sz + (c.fz - c.sz) * e;
          y = c.sy + (c.fy + 0.3 - c.sy) * (u * u);
        } else if (local < c.tf + c.ts) {
          // landing — one damped bounce into its resting place
          const v = (local - c.tf) / c.ts;
          const h = 0.3 * (1 - v) * Math.abs(Math.cos(v * Math.PI * 2.1)) * Math.exp(-2.4 * v);
          const e = v * v * (3 - 2 * v);
          x = c.fx + (c.sx - c.fx) * (1 - e) * 0.06;
          z = c.fz + (c.sz - c.fz) * (1 - e) * 0.06;
          y = c.fy + h;
          squash = 1 - 0.16 * Math.exp(-9 * v) * Math.abs(Math.sin(v * Math.PI * 3));
        } else {
          x = c.fx; y = c.fy; z = c.fz;
        }

        const spinT = Math.min(local, c.tf + c.ts) / (c.tf + c.ts);
        const spinE = 1 - Math.pow(1 - spinT, 3);
        axis.set(c.ax, c.ay, c.az);
        quat.setFromAxisAngle(axis, c.spin * c.tf * spinE);
        baseQuat.setFromEuler(c.euler);
        quat.multiply(baseQuat);

        dummy.position.set(x, y, z);
        dummy.quaternion.copy(quat);
        dummy.scale.set(c.wx * c.r, c.wy * c.r * squash, c.wz * c.r);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },

    dispose() {
      geometry.dispose();
      oat.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}

export function buildClusters(data, palette) {
  const rnd = mulberry32(data.seed ^ 0x9e37);
  const range = (a, b) => a + rnd() * (b - a);
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 0.7;
  const { spawnY, spread, pour, fall, settle } = data.timing;

  const out = [];
  const n = data.count;

  const add = (fx, fy, fz, r, t0, tf, ts) => {
    const c = {
      fx0: fx, fz0: fz,
      fx, fy, fz, r,
      sx0: gauss() * spread, sz0: gauss() * spread,
      sy: spawnY + rnd() * 0.5,
      t0, tf, ts,
      euler: new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28),
      spin: range(3, 9) * (rnd() < 0.5 ? -1 : 1),
      wx: range(0.78, 1.24), wy: range(0.72, 1.1), wz: range(0.8, 1.22),
      color: palette[pickShade(rnd())],
      recentre(offset) {
        this.fx = this.fx0 + offset;
        this.fz = this.fz0;
        this.sx = this.sx0 + offset;
        this.sz = this.sz0;
      },
    };
    // pick the spin axis after the rest, so the seed stays stable
    const ax = gauss(), ay = gauss(), az = gauss();
    const len = Math.hypot(ax, ay, az) || 1;
    c.ax = ax / len; c.ay = ay / len; c.az = az / len;
    c.recentre(JAR_X);
    out.push(c);
  };

  for (let i = 0; i < n; i++) {
    const p = data.pos;
    add(
      p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3],
      Math.max(0, (i / n) * pour + range(-0.012, 0.012)),
      fall + range(-0.05, 0.05),
      settle + range(-0.04, 0.04)
    );
  }

  for (let i = 0; i < data.spill.length / 4; i++) {
    const s = data.spill;
    add(
      s[i * 4], s[i * 4 + 1], s[i * 4 + 2], s[i * 4 + 3],
      pour + range(0.02, 0.16),
      fall + 0.08,
      0.4
    );
  }

  return out;
}

export function pickShade(r) {
  if (r < 0.10) return 0;   // pale oat
  if (r < 0.46) return 1;   // honey
  if (r < 0.78) return 2;   // toasted
  if (r < 0.93) return 3;   // dark edge
  return 4;                 // almond
}


export function clusterGeometry() {
  // An icosahedron pushed out of shape by a smooth wobble — granola is lumpy,
  // never a ball and never a spike. The displacement has to be a continuous
  // function of direction, or neighbouring corners pull apart into thorns.
  const geo = new THREE.IcosahedronGeometry(0.5, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const bump =
      1
      + 0.20 * Math.sin(3.3 * n.x + 1.1) * Math.cos(2.6 * n.y + 0.7)
      + 0.15 * Math.sin(2.2 * n.z + 2.4)
      + 0.09 * Math.cos(5.1 * n.x + 4.0) * Math.sin(4.4 * n.z + 1.6);
    v.multiplyScalar(bump);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

