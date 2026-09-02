// The Pour — the opening moment for Heaven's Harvest Pantry.
//
// A real glass jar on a warm counter. Granola falls into it, tumbles, settles,
// and goes still. Then the words arrive.
//
// The pile itself was worked out once by bake.mjs and is read from pour.json.
// Everything else — the scatter of the stream, spin, squash, which shade of
// toast each piece is — is regenerated here from the same seed, so it looks
// identical on every visit without any of it being sent over the wire.
//
//   import { createPour } from './pour.js';
//   const pour = createPour({ canvas, data, onFinish });
//   pour.dispose();

import * as THREE from 'three';

const JAR_X = 0.86;          // the jar sits right of centre; the words go left
const LOOK_AT = new THREE.Vector3(0.12, 0.78, 0);

export function createPour({ canvas, data, onFinish, reducedMotion = false }) {
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
  const counter = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.MeshStandardMaterial({
      map: woodTexture(),
      color: '#9a7c58',
      roughness: 0.74,
      metalness: 0,
    })
  );
  counter.rotation.x = -Math.PI / 2;
  counter.receiveShadow = true;
  scene.add(counter);

  // A plain wall a little way back. Without it the empty half of the jar has
  // nothing to refract and reads as milky plastic.
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 14),
    new THREE.MeshStandardMaterial({ color: '#e7d6b6', roughness: 0.95, metalness: 0 })
  );
  wall.position.set(0, 6.4, -4.6);
  wall.receiveShadow = true;
  scene.add(wall);

  // --- the jar ---------------------------------------------------------------
  const jar = new THREE.Group();
  jar.position.x = JAR_X;
  scene.add(jar);

  const R = data.jar.radius;
  const WALL = 0.035;
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 1,
    thickness: 0.10,
    roughness: 0.028,
    metalness: 0,
    ior: 1.5,
    clearcoat: 0.18,
    clearcoatRoughness: 0.06,
    envMapIntensity: 0.95,
    attenuationColor: new THREE.Color('#d8e6d4'),   // the faint green of jar glass
    attenuationDistance: 1.6,
    transparent: true,
    side: THREE.FrontSide,
  });

  // Profile of a squat mason jar, drawn bottom to top and spun on the lathe.
  const outer = R + WALL;
  const NECK = outer * 0.64;
  const profile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(outer - 0.07, 0.0),
    new THREE.Vector2(outer, 0.07),
    new THREE.Vector2(outer, 1.06),
    new THREE.Vector2(outer - 0.02, 1.17),          // shoulder starts
    new THREE.Vector2(outer * 0.90, 1.28),
    new THREE.Vector2(NECK + 0.02, 1.38),
    new THREE.Vector2(NECK, 1.46),                  // neck
    new THREE.Vector2(NECK, 1.58),
    new THREE.Vector2(NECK - WALL, 1.58),
    new THREE.Vector2(NECK - WALL, 1.46),
    new THREE.Vector2(NECK - WALL + 0.02, 1.38),
    new THREE.Vector2(outer * 0.90 - WALL, 1.28),
    new THREE.Vector2(outer - WALL - 0.02, 1.17),
    new THREE.Vector2(outer - WALL, 1.06),
    new THREE.Vector2(outer - WALL, 0.065),
    new THREE.Vector2(0.0, 0.065),
  ];
  const glassMesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), glass);
  glassMesh.castShadow = true;
  jar.add(glassMesh);

  // A soft dark pool right under the glass. A shadow map alone leaves the jar
  // looking like it is hovering a centimetre above the counter.
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(outer * 3.4, outer * 3.4),
    new THREE.MeshBasicMaterial({
      map: contactTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.004;
  contact.renderOrder = -1;
  jar.add(contact);

  // The threads on the neck: three shallow rings.
  const threadMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 0.9, thickness: 0.08,
    roughness: 0.12, ior: 1.5, transparent: true,
  });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(NECK + 0.008, 0.013, 8, 48), threadMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.44 + i * 0.045;
    jar.add(ring);
  }

  // The label, wrapped around the front of the glass.
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(outer + 0.004, outer + 0.004, 0.58, 48, 1, true, -0.85, 1.7),
    new THREE.MeshStandardMaterial({
      map: labelTexture(),
      transparent: true,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  );
  label.position.y = 0.56;
  jar.add(label);

  // --- the granola -----------------------------------------------------------
  const clusterGeo = clusterGeometry();
  const oat = oatTexture();
  const clusterMat = new THREE.MeshStandardMaterial({
    map: oat,
    roughnessMap: oat,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.7,
  });

  const total = data.count + data.spill.length / 4;
  const mesh = new THREE.InstancedMesh(clusterGeo, clusterMat, total);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const palette = data.palette.map((hex) => new THREE.Color(hex).convertSRGBToLinear());
  const clusters = buildClusters(data, palette);
  for (let i = 0; i < clusters.length; i++) mesh.setColorAt(i, clusters[i].color);
  mesh.instanceColor.needsUpdate = true;

  // --- run it ----------------------------------------------------------------
  const dummy = new THREE.Object3D();
  const axis = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const baseQuat = new THREE.Quaternion();

  let start = null;
  let raf = 0;
  let finished = false;
  let disposed = false;

  function place(t) {
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
  }

  function frame(now) {
    if (disposed) return;
    if (start === null) start = now;
    const t = (now - start) / 1000;
    place(t);
    renderer.render(scene, camera);

    if (!finished && t >= data.duration) {
      finished = true;
      if (onFinish) onFinish();
    }
    // Nothing moves once the pile is at rest, so stop drawing and give the
    // phone back to the person holding it.
    if (t < data.duration + 0.35) raf = requestAnimationFrame(frame);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // On a narrow screen, pull back and centre the jar — there is no room
    // beside it for the headline, so the words go underneath instead.
    const narrow = w / h < 1;
    jar.position.x = narrow ? 0 : JAR_X;
    for (const c of clusters) c.recentre(narrow ? 0 : JAR_X);
    // On a phone the words sit underneath, so the jar is lifted into the top
    // half of the frame and the camera pulls back far enough to hold all of it.
    camera.position.set(0, narrow ? 1.55 : 1.18, narrow ? 6.6 : 4.35);
    camera.lookAt(narrow ? new THREE.Vector3(0, 0.42, 0) : LOOK_AT);
    camera.updateProjectionMatrix();
    if (finished || reducedMotion) { place(data.duration); renderer.render(scene, camera); }
  }

  window.addEventListener('resize', resize);
  resize();

  if (reducedMotion) {
    // Someone has asked their device to keep still. Show them the jar already
    // full, in the same light, and skip the fall entirely.
    place(data.duration);
    renderer.render(scene, camera);
    finished = true;
    if (onFinish) onFinish();
  } else {
    raf = requestAnimationFrame(frame);
  }

  return {
    get finished() { return finished; },
    // Freeze the pour at a given second. Used to review individual beats while
    // designing; the site itself never calls it.
    seek(t) {
      cancelAnimationFrame(raf);
      place(t);
      renderer.render(scene, camera);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      clusterGeo.dispose();
      oat.dispose();
      clusterMat.dispose();
      mesh.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// Regenerating the cosmetic half of the pour from the seed

function buildClusters(data, palette) {
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

function pickShade(r) {
  if (r < 0.10) return 0;   // pale oat
  if (r < 0.46) return 1;   // honey
  if (r < 0.78) return 2;   // toasted
  if (r < 0.93) return 3;   // dark edge
  return 4;                 // almond
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Everything drawn rather than downloaded

function clusterGeometry() {
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

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function woodTexture() {
  const tex = canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#87643c';
    g.fillRect(0, 0, w, h);
    // planks
    for (let y = 0; y < h; y += 168) {
      g.fillStyle = 'rgba(58,33,12,0.45)';
      g.fillRect(0, y, w, 4);
      g.fillStyle = 'rgba(226,186,132,0.22)';
      g.fillRect(0, y + 4, w, 3);
    }
    // grain
    const rnd = mulberry32(9182);
    for (let i = 0; i < 5200; i++) {
      const y = rnd() * h;
      const x = rnd() * w;
      const len = 40 + rnd() * 220;
      g.strokeStyle = `rgba(${rnd() < 0.5 ? '86,52,20' : '214,176,124'},${0.05 + rnd() * 0.13})`;
      g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + len * 0.35, y + (rnd() - 0.5) * 5, x + len * 0.7, y + (rnd() - 0.5) * 5, x + len, y);
      g.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}

function labelTexture() {
  return canvasTexture(1024, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // the paper
    const pad = 40;
    g.fillStyle = '#f4eee2';
    g.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    g.strokeStyle = '#a9b18a';
    g.lineWidth = 3;
    g.setLineDash([9, 9]);
    g.strokeRect(pad + 22, pad + 22, w - pad * 2 - 44, h - pad * 2 - 44);
    g.setLineDash([]);

    g.textAlign = 'center';
    g.fillStyle = '#5b3d1e';
    g.font = '600 54px Georgia, serif';
    g.fillText("HEAVEN'S", w / 2, 190);
    g.fillText('HARVEST', w / 2, 250);
    g.font = 'italic 44px Georgia, serif';
    g.fillStyle = '#6b7a4a';
    g.fillText('Honey Almond', w / 2, 330);

    // the gold heart from her logo
    g.fillStyle = '#c9a06a';
    g.beginPath();
    const cx = w / 2, cy = 382, s = 26;
    g.moveTo(cx, cy + s * 0.9);
    g.bezierCurveTo(cx - s * 1.5, cy - s * 0.2, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.3);
    g.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.2, cx, cy + s * 0.9);
    g.fill();
  });
}

function oatTexture() {
  // Flecks of oat, seed and salt scattered over each cluster. Multiplied by the
  // instance colour, so it adds surface without touching the shade.
  const tex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#efe6d6';
    g.fillRect(0, 0, w, h);
    const rnd = mulberry32(6203);
    for (let i = 0; i < 900; i++) {
      const x = rnd() * w, y = rnd() * h;
      const r = 1.2 + rnd() * 4.2;
      const shade = rnd();
      g.fillStyle = shade < 0.42 ? 'rgba(120,84,44,0.5)'
                  : shade < 0.72 ? 'rgba(255,250,238,0.75)'
                  : shade < 0.9  ? 'rgba(76,48,20,0.45)'
                                 : 'rgba(198,158,104,0.6)';
      g.beginPath();
      g.ellipse(x, y, r, r * (0.45 + rnd() * 0.6), rnd() * 3.14, 0, 6.283);
      g.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function contactTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    const grad = g.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.46);
    grad.addColorStop(0, 'rgba(52,30,10,0.62)');
    grad.addColorStop(0.55, 'rgba(72,44,18,0.26)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function backdropTexture() {
  return canvasTexture(64, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f6ead2');
    grad.addColorStop(0.55, '#e9d7b6');
    grad.addColorStop(1, '#d9c096');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function kitchenEnvironment() {
  // A stand-in for a captured kitchen: warm sky, a bright window to the left,
  // a wooden floor bounce below. Enough for the glass to have something to
  // refract until a real photographed environment is dropped in.
  const tex = canvasTexture(1024, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fff6e4');
    grad.addColorStop(0.48, '#f0e2c8');
    grad.addColorStop(0.52, '#c69a63');
    grad.addColorStop(1, '#8a6134');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // the window
    g.fillStyle = '#fffdf6';
    g.fillRect(w * 0.16, h * 0.06, w * 0.2, h * 0.36);
    g.fillStyle = 'rgba(200,170,120,0.5)';
    g.fillRect(w * 0.255, h * 0.06, 6, h * 0.36);
    g.fillRect(w * 0.16, h * 0.23, w * 0.2, 6);

    // a softer second source opposite
    const soft = g.createRadialGradient(w * 0.72, h * 0.22, 10, w * 0.72, h * 0.22, w * 0.16);
    soft.addColorStop(0, 'rgba(255,246,226,0.85)');
    soft.addColorStop(1, 'rgba(255,246,226,0)');
    g.fillStyle = soft;
    g.fillRect(w * 0.5, 0, w * 0.5, h * 0.5);
  });
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}
