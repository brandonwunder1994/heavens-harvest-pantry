// Living-photograph pour: the jar is a product shot. Granola falls through
// the mouth, bounces, and stays. The filled photo rises to the pile top
// because pieces landed, not because a timer wiped a clip.

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNT = 140;
const SPILL = 3;
const SEED = 20260913;
const POUR = 1.45;
const FALL = 0.62;
const SETTLE = 0.24;
const FILL_TOP = 0.18;
const STEAM_END = 4.8;

const FLAKE_SRCS = Array.from({ length: 12 }, (_, i) => `/hero/flakes/${String(i).padStart(2, '0')}.png`);

type Flake = {
  img: HTMLImageElement;
  t0: number;
  tf: number;
  ts: number;
  sx: number;
  sy: number;
  fx: number;
  fy: number;
  spin: number;
  spinV: number;
  size: number;
  spill: boolean;
  restX: number;
  restY: number;
  vx: number;
  vy: number;
};

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function gauss(rnd: () => number) {
  return (rnd() + rnd() + rnd() + rnd() - 2) * 0.7;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`pour asset missing: ${src}`));
    img.src = src;
  });
}

export function preloadPour() {
  return Promise.all([
    loadImage('/hero/plate-wide.webp'),
    loadImage('/hero/plate-tall.webp'),
    loadImage('/hero/jar-empty.png'),
    loadImage('/hero/jar-filled.png'),
    ...FLAKE_SRCS.map(loadImage),
  ]).then((images) => images.slice(4));
}

type JarBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  mouthX: number;
  mouthY: number;
  mouthW: number;
  innerLeft: number;
  innerRight: number;
  innerBottom: number;
  innerTop: number;
  floor: number;
};

export function createPour({
  scene,
  canvas,
  flakes: preloaded,
}: {
  scene: HTMLElement;
  canvas: HTMLCanvasElement;
  flakes?: HTMLImageElement[];
}) {
  const fill = scene.querySelector('.jar-fill') as HTMLElement | null;
  const steam = scene.querySelector('.steam') as HTMLElement | null;
  const jar = scene.querySelector('.jar-stack') as HTMLElement | null;
  const host = scene.closest('.the-pour') as HTMLElement | null;
  const ctx = canvas.getContext('2d');
  if (!ctx || !fill || !jar) {
    throw new Error('pour scene is missing a layer');
  }
  const fillLayer = fill;
  const jarStack = jar;
  const gfx = ctx;

  const rnd = mulberry32(SEED);
  const flakes: Flake[] = [];
  const images: HTMLImageElement[] = preloaded ? [...preloaded] : [];
  let imagesReady = images.length > 0;

  if (!imagesReady) {
    Promise.all(FLAKE_SRCS.map(loadImage)).then((loaded) => {
      images.push(...loaded);
      imagesReady = true;
      buildFlakes();
      if (frozen == null) start();
      else apply(frozen);
    });
  }

  const pointer = { x: 0, y: 0, live: false };
  let raf = 0;
  let started = 0;
  let frozen: number | null = null;
  let running = false;

  function box(): JarBox {
    const j = jarStack.getBoundingClientRect();
    const s = scene.getBoundingClientRect();
    const x = j.left - s.left;
    const y = j.top - s.top;
    return {
      x,
      y,
      w: j.width,
      h: j.height,
      mouthX: x + j.width * 0.5,
      mouthY: y + j.height * 0.1,
      mouthW: j.width * 0.22,
      innerLeft: x + j.width * 0.2,
      innerRight: x + j.width * 0.8,
      innerBottom: y + j.height * 0.86,
      innerTop: y + j.height * 0.22,
      floor: y + j.height + 8,
    };
  }

  function buildFlakes() {
    flakes.length = 0;
    if (!images.length) return;
    const b = box();
    const innerW = b.innerRight - b.innerLeft;
    const innerH = b.innerBottom - b.innerTop;
    const mid = (b.innerLeft + b.innerRight) / 2;

    for (let i = 0; i < COUNT + SPILL; i++) {
      const spill = i >= COUNT;
      const img = images[i % images.length];
      if (spill) {
        flakes.push({
          img,
          t0: 1.15 + rnd() * 0.55,
          tf: FALL * (0.85 + rnd() * 0.2),
          ts: SETTLE,
          sx: b.mouthX + gauss(rnd) * b.mouthW * 0.4,
          sy: b.mouthY - 90 - rnd() * 50,
          fx: b.x + b.w + 18 + rnd() * 64,
          fy: b.floor + 4,
          spin: rnd() * Math.PI * 2,
          spinV: (rnd() - 0.5) * 8,
          size: 12 + rnd() * 10,
          spill: true,
          restX: 0,
          restY: 0,
          vx: 0,
          vy: 0,
        });
        continue;
      }

      const along = i / Math.max(1, COUNT - 1);
      const fy = b.innerBottom - along * innerH * 0.96;
      const rowSpread = 0.28 + 0.2 * Math.sin(along * Math.PI);
      const fx = mid + gauss(rnd) * innerW * rowSpread;
      flakes.push({
        img,
        t0: rnd() * POUR,
        tf: FALL * (0.82 + rnd() * 0.28),
        ts: SETTLE * (0.85 + rnd() * 0.3),
        sx: b.mouthX + gauss(rnd) * b.mouthW * 0.38,
        sy: b.mouthY - 130 - rnd() * 90,
        fx: clamp(fx, b.innerLeft + 8, b.innerRight - 8),
        fy,
        spin: rnd() * Math.PI * 2,
        spinV: (4 + rnd() * 5) * (rnd() < 0.5 ? -1 : 1),
        size: 11 + rnd() * 13,
        spill: false,
        restX: 0,
        restY: 0,
        vx: 0,
        vy: 0,
      });
    }
  }

  function pose(flake: Flake, t: number, b: JarBox) {
    const local = t - flake.t0;
    if (local < 0) return null;
    if (flake.spill) {
      const u = clamp(local / (flake.tf + flake.ts), 0, 1);
      const e = easeOut(u);
      const x = flake.sx + (flake.fx - flake.sx) * e + flake.vx;
      const y = flake.sy + (flake.fy - flake.sy) * e + flake.vy;
      flake.restX = x;
      flake.restY = y;
      return { x, y, rot: flake.spin + t * flake.spinV * 0.12, squash: 1, alpha: 1, inside: false };
    }

    if (local < flake.tf) {
      const u = local / flake.tf;
      const e = smooth(u);
      const x = flake.sx + (flake.fx - flake.sx) * e;
      const y = flake.sy + (flake.fy + 16 - flake.sy) * (u * u);
      return {
        x,
        y,
        rot: flake.spin + local * flake.spinV,
        squash: 1,
        alpha: 1,
        inside: y > b.mouthY,
      };
    }

    if (local < flake.tf + flake.ts) {
      const v = (local - flake.tf) / flake.ts;
      const bounce = 16 * (1 - v) * Math.abs(Math.cos(v * Math.PI * 2.1)) * Math.exp(-2.4 * v);
      const e = smooth(v);
      const x = flake.fx + (flake.sx - flake.fx) * (1 - e) * 0.06;
      const y = flake.fy - bounce;
      const squash = 1 - 0.16 * Math.exp(-9 * v) * Math.abs(Math.sin(v * Math.PI * 3));
      return { x, y, rot: flake.spin + flake.tf * flake.spinV * easeOut(v), squash, alpha: 1, inside: true };
    }

    const age = local - flake.tf;
    const alpha = age < 0.28 ? 1 : clamp(1 - (age - 0.28) / 0.45, 0, 1);
    return { x: flake.fx, y: flake.fy, rot: flake.spin + flake.tf * flake.spinV, squash: 1, alpha, inside: true };
  }

  function fillAmount(t: number) {
    let landed = 0;
    for (const flake of flakes) {
      if (!flake.spill && t >= flake.t0 + flake.tf) landed += 1;
    }
    return clamp(landed / COUNT, 0, 1);
  }

  function moundClip(amount: number) {
    const top = (1 - amount) * 100 + amount * FILL_TOP * 100;
    const dip = 3.2 * amount;
    return `polygon(0% 100%, 0% ${top + 1.2}%, 12% ${top}%, 28% ${top - dip * 0.45}%, 50% ${top - dip}%, 72% ${top - dip * 0.45}%, 88% ${top}%, 100% ${top + 1.2}%, 100% 100%)`;
  }

  function apply(t: number) {
    fillLayer.style.clipPath = moundClip(fillAmount(t));
    if (steam) steam.classList.toggle('on', t > 1.2 && t < STEAM_END);
    draw(t);
  }

  function clipInterior(b: JarBox) {
    gfx.beginPath();
    const x = b.innerLeft - 4;
    const y = b.mouthY;
    const w = b.innerRight - b.innerLeft + 8;
    const h = b.innerBottom - b.mouthY + 10;
    gfx.roundRect(x, y, w, h, w * 0.42);
    gfx.clip();
  }

  function draw(t: number) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    gfx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gfx.clearRect(0, 0, w, h);
    if (!imagesReady) return;

    const b = box();
    const air: ReturnType<typeof pose>[] = [];
    const inside: ReturnType<typeof pose>[] = [];
    const airFlakes: Flake[] = [];
    const inFlakes: Flake[] = [];
    for (const flake of flakes) {
      const p = pose(flake, t, b);
      if (!p) continue;
      if (p.inside) {
        inside.push(p);
        inFlakes.push(flake);
      } else {
        air.push(p);
        airFlakes.push(flake);
      }
    }

    for (let i = 0; i < air.length; i++) {
      const p = air[i]!;
      paint(airFlakes[i]!, p.x, p.y, p.rot, p.alpha, p.squash);
    }

    gfx.save();
    clipInterior(b);
    for (let i = 0; i < inside.length; i++) {
      const p = inside[i]!;
      paint(inFlakes[i]!, p.x, p.y, p.rot, p.alpha, p.squash);
    }
    gfx.restore();
  }

  function paint(flake: Flake, x: number, y: number, rot: number, alpha: number, squash: number) {
    if (alpha <= 0.02) return;
    gfx.save();
    gfx.globalAlpha = clamp(alpha, 0, 1);
    gfx.translate(x, y);
    gfx.rotate(rot);
    const s = flake.size;
    gfx.drawImage(flake.img, -s / 2, (-s / 2) * squash, s, s * squash);
    gfx.restore();
  }

  function frame(now: number) {
    if (!started) started = now;
    const t = frozen ?? (now - started) / 1000;
    apply(t);
    const crumbsLive = flakes.some((f) => f.spill && (Math.abs(f.vx) > 0.12 || Math.abs(f.vy) > 0.12));
    if (frozen != null) return;
    if (t < STEAM_END || crumbsLive || pointer.live) {
      raf = requestAnimationFrame(frame);
      running = true;
      return;
    }
    running = false;
  }

  function start() {
    if (running) return;
    raf = requestAnimationFrame(frame);
    running = true;
  }

  function onPointer(ev: PointerEvent) {
    const s = scene.getBoundingClientRect();
    pointer.x = ev.clientX - s.left;
    pointer.y = ev.clientY - s.top;
    pointer.live = true;
    const t = frozen ?? (performance.now() - started) / 1000;
    if (t < POUR + FALL + SETTLE) return;
    for (const flake of flakes) {
      if (!flake.spill) continue;
      const dx = pointer.x - flake.restX;
      const dy = pointer.y - flake.restY;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 70) {
        flake.vx += (dx / d) * -8;
        flake.vy += (dy / d) * -4;
      }
      flake.vx *= 0.84;
      flake.vy *= 0.84;
    }
    if (!running) start();
  }

  function onLeave() {
    pointer.live = false;
  }

  function onResize() {
    buildFlakes();
    const t = frozen ?? (started ? (performance.now() - started) / 1000 : 0);
    apply(Math.max(t, 0));
  }

  scene.addEventListener('pointermove', onPointer);
  scene.addEventListener('pointerleave', onLeave);
  const ro = new ResizeObserver(onResize);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      scene.removeEventListener('pointermove', onPointer);
      scene.removeEventListener('pointerleave', onLeave);
      ro.disconnect();
    },
    seek(t: number) {
      frozen = t;
      apply(t);
    },
    stage: {
      setHour(name: string) {
        if (!host) return false;
        host.dataset.hour = name;
        return true;
      },
    },
    start() {
      ro.observe(scene);
      if (!imagesReady) return;
      buildFlakes();
      if (frozen != null) apply(frozen);
      else start();
    },
  };
}
