// Bakes The Pour.
//
// Runs once, here, on a laptop. Drops ~420 granola clusters into the jar with a
// real settling simulation, lets the pile find its own shape, then records where
// every piece ends up and how it got there. The website never runs any of this —
// it replays the recording, which is why the opening costs a phone nothing and
// looks identical on every visit.
//
//   node bake.mjs        ->  writes pour.json
//
// Deterministic: same seed in, same pile out. Change SEED to shake the jar.

import { writeFileSync } from 'node:fs';

const SEED = 20260901;

const COUNT = 420;          // clusters inside the jar
const SPILL = 3;            // clusters that miss and land on the counter

const JAR_R = 0.60;         // inner radius of the glass
const JAR_FLOOR = 0.0;
const R_MIN = 0.046;
const R_MAX = 0.118;

const SPAWN_Y = 3.05;       // above the top of the frame
const STREAM_SPREAD = 0.115; // how wide the falling stream is
const POUR_SECONDS = 1.45;  // last cluster leaves the stream at this point
const FALL_SECONDS = 0.62;
const SETTLE_SECONDS = 0.24;

// --- seeded random ---------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const range = (a, b) => a + rnd() * (b - a);
const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 0.7;

// --- settle the pile -------------------------------------------------------
// Position-based dynamics: everything falls a little each step, then overlaps
// are pushed apart and anything outside the glass is pushed back in. Repeat
// until the pile stops moving. Crude next to a real physics engine, and
// indistinguishable once it has come to rest.

const parts = [];
for (let i = 0; i < COUNT; i++) {
  const r = range(R_MIN, R_MAX);
  const a = rnd() * Math.PI * 2;
  const d = Math.sqrt(rnd()) * (JAR_R - r);
  parts.push({
    x: Math.cos(a) * d,
    y: JAR_FLOOR + r + rnd() * 2.6,
    z: Math.sin(a) * d,
    r,
  });
}

const CELL = R_MAX * 2;
function neighbours() {
  const grid = new Map();
  const key = (i, j, k) => i + ',' + j + ',' + k;
  for (let n = 0; n < parts.length; n++) {
    const p = parts[n];
    const k = key(Math.floor(p.x / CELL), Math.floor(p.y / CELL), Math.floor(p.z / CELL));
    let bucket = grid.get(k);
    if (!bucket) grid.set(k, (bucket = []));
    bucket.push(n);
  }
  return { grid, key };
}

const STEPS = 900;
for (let step = 0; step < STEPS; step++) {
  const fall = step < STEPS * 0.75 ? 0.0075 : 0.003;
  // A little sideways noise while the pile is still loose. Without it the
  // spheres settle into a crystal lattice and the granola reads as popcorn.
  const shake = step < STEPS * 0.6 ? 0.0045 : 0;
  for (const p of parts) {
    p.y -= fall;
    if (shake) { p.x += (rnd() - 0.5) * shake; p.z += (rnd() - 0.5) * shake; }
  }

  for (let pass = 0; pass < 3; pass++) {
    const { grid, key } = neighbours();
    for (let n = 0; n < parts.length; n++) {
      const p = parts[n];
      const gi = Math.floor(p.x / CELL), gj = Math.floor(p.y / CELL), gk = Math.floor(p.z / CELL);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) {
        const bucket = grid.get(key(gi + di, gj + dj, gk + dk));
        if (!bucket) continue;
        for (const m of bucket) {
          if (m <= n) continue;
          const q = parts[m];
          let dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
          const min = (p.r + q.r) * 0.85;   // let them nest, the way real clusters wedge together
          let d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= min * min || d2 === 0) continue;
          const d = Math.sqrt(d2);
          const push = (min - d) * 0.5;
          dx /= d; dy /= d; dz /= d;
          p.x -= dx * push; p.y -= dy * push; p.z -= dz * push;
          q.x += dx * push; q.y += dy * push; q.z += dz * push;
        }
      }
    }

    for (const p of parts) {
      const rad = Math.hypot(p.x, p.z);
      const lim = JAR_R - p.r;
      if (rad > lim) {
        const s = lim / rad;
        p.x *= s; p.z *= s;
      }
      if (p.y < JAR_FLOOR + p.r) p.y = JAR_FLOOR + p.r;
    }
  }
}

const pileTop = parts.reduce((m, p) => Math.max(m, p.y + p.r), 0);

// --- write the resting pile -------------------------------------------------
// Only the pile itself is recorded: where each cluster came to rest and how big
// it is. Everything cosmetic — the scatter of the falling stream, spin, squash,
// which shade of toast each piece is — is regenerated in the browser from the
// same seed, so it is identical on every visit without being shipped.
// Bottom of the pile first, so the jar visibly fills from the base up.

parts.sort((a, b) => (a.y - a.r) - (b.y - b.r));

const pos = [];
for (const p of parts) pos.push(round(p.x), round(p.y), round(p.z), round(p.r));

// the two or three pieces that miss the jar and stay on the counter
const spill = [];
for (let i = 0; i < SPILL; i++) {
  const a = range(-0.5, 0.9) + (i % 2 ? Math.PI : 0);
  const d = range(0.95, 1.7);
  const r = range(R_MIN, R_MAX);
  spill.push(round(Math.cos(a) * d), round(r * 0.86), round(Math.sin(a) * d * 0.6), round(r));
}

function round(n) { return Math.round(n * 1000) / 1000; }

const out = {
  seed: SEED,
  jar: { radius: JAR_R, floor: JAR_FLOOR, fill: round(pileTop) },
  timing: {
    spawnY: SPAWN_Y,
    spread: STREAM_SPREAD,
    pour: POUR_SECONDS,
    fall: FALL_SECONDS,
    settle: SETTLE_SECONDS,
  },
  duration: round(POUR_SECONDS + FALL_SECONDS + SETTLE_SECONDS + 0.3),
  palette: ['#d9b979', '#bd8843', '#94612c', '#5a3616', '#e7d5ab'],
  count: parts.length,
  pos,
  spill,
};

writeFileSync(new URL('./pour.json', import.meta.url), JSON.stringify(out));

const bytes = JSON.stringify(out).length;
console.log(
  `baked ${parts.length} clusters + ${SPILL} on the counter — pile settles at ` +
  `${out.jar.fill.toFixed(2)} (jar radius ${JAR_R}) — pour.json ${(bytes / 1024).toFixed(1)} KB raw`
);
