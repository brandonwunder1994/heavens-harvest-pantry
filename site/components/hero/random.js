// One seeded random, shared.
//
// Every speckle on the counter, every shade of toast on a cluster and every
// scatter in the falling stream comes from here. It is seeded, so the scene is
// identical on every visit without a single byte of it being sent over the
// wire — and it lives on its own because the surfaces and the granola both draw
// from it and must not each have their own.

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
