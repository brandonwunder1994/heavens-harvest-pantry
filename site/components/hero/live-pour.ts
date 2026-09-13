// Living-photograph pour: the jar is a product shot, the food is the only
// thing that moves. Flakes fall into the mouth, the filled photo reveals from
// the bottom, the lid settles, and three crumbs on the counter still answer
// to the pointer.

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DURATION = 2.62;
const LID_AT = 2.72;
const STEAM_END = 4.6;
const FILL_TOP = 0.17;
const COUNT = 46;
const SPILL = 3;
const SEED = 20260913;

const FLAKE_SRCS = Array.from({ length: 12 }, (_, i) => `/hero/flakes/${String(i).padStart(2, '0')}.png`);

type Flake = {
  img: HTMLImageElement;
  born: number;
  life: number;
  x: number;
  startX: number;
  drift: number;
  spin: number;
  spinV: number;
  size: number;
  spill: boolean;
  restX: number;
  restY: number;
  vx: number;
  vy: number;
};

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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
    loadImage('/hero/lid.png'),
    ...FLAKE_SRCS.map(loadImage),
  ]).then((images) => images.slice(5));
}

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
  const lid = scene.querySelector('.jar-lid') as HTMLElement | null;
  const steam = scene.querySelector('.steam') as HTMLElement | null;
  const jar = scene.querySelector('.jar-stack') as HTMLElement | null;
  const host = scene.closest('.the-pour') as HTMLElement | null;
  const ctx = canvas.getContext('2d');
  if (!ctx || !fill || !lid || !jar) {
    throw new Error('pour scene is missing a layer');
  }
  // Nested function declarations are hoisted, so TypeScript will not keep the
  // null-check above. Capture the narrowed nodes once and use those.
  const fillLayer = fill;
  const lidLayer = lid;
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

  function mouth() {
    const j = jarStack.getBoundingClientRect();
    const s = scene.getBoundingClientRect();
    return {
      x: j.left - s.left + j.width * 0.5,
      y: j.top - s.top + j.height * 0.08,
      w: j.width * 0.28,
      land: j.top - s.top + j.height * 0.14,
      floor: j.bottom - s.top + 10,
      left: j.left - s.left,
      right: j.right - s.left,
    };
  }

  function buildFlakes() {
    flakes.length = 0;
    if (!images.length) return;
    const m = mouth();
    for (let i = 0; i < COUNT + SPILL; i++) {
      const spill = i >= COUNT;
      const img = images[i % images.length];
      flakes.push({
        img,
        born: spill ? 1.15 + rnd() * 0.55 : rnd() * 1.45,
        life: 0.55 + rnd() * 0.28,
        x: 0,
        startX: m.x + (rnd() - 0.5) * m.w * 0.72,
        drift: (rnd() - 0.5) * 36,
        spin: rnd() * Math.PI * 2,
        spinV: (rnd() - 0.5) * 7,
        size: spill ? 18 + rnd() * 14 : 22 + rnd() * 28,
        spill,
        restX: m.right + 18 + rnd() * 64,
        restY: 0,
        vx: 0,
        vy: 0,
      });
    }
  }

  function fillAmount(t: number) {
    const p = clamp((t - 0.2) / 2.15, 0, 1);
    return easeOut(p);
  }

  function apply(t: number) {
    const amount = fillAmount(t);
    const top = (1 - amount) * 100 + amount * FILL_TOP * 100;
    fillLayer.style.clipPath = `inset(${top}% 0 0 0)`;
    lidLayer.classList.toggle('on', t >= LID_AT);
    lidLayer.style.setProperty('--lid-t', t >= LID_AT ? '1' : '0');
    if (steam) steam.classList.toggle('on', t > 1.8 && t < STEAM_END);
    draw(t);
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

    const m = mouth();
    for (const flake of flakes) {
      const local = t - flake.born;
      if (local < 0) continue;

      if (flake.spill) {
        const u = clamp(local / flake.life, 0, 1);
        const e = easeOut(u);
        const x = flake.startX + (flake.restX - flake.startX) * e + flake.vx;
        const y0 = m.y - 80;
        const y1 = m.floor + 6;
        const y = y0 + (y1 - y0) * e + flake.vy;
        flake.restY = y1;
        paint(flake, x, y, flake.spin + t * flake.spinV * 0.15, 1);
        continue;
      }

      if (local > flake.life + 0.08) continue;
      const u = clamp(local / flake.life, 0, 1);
      const e = u * u;
      const x = flake.startX + flake.drift * u;
      const y = (m.y - 160) + (m.land - (m.y - 160)) * e;
      const fade = u > 0.82 ? 1 - (u - 0.82) / 0.18 : 1;
      const scale = 1 - u * 0.18;
      paint(flake, x, y, flake.spin + local * flake.spinV, fade, scale);
    }
  }

  function paint(flake: Flake, x: number, y: number, rot: number, alpha: number, scale = 1) {
    if (alpha <= 0.02) return;
    gfx.save();
    gfx.globalAlpha = clamp(alpha, 0, 1);
    gfx.translate(x, y);
    gfx.rotate(rot);
    const s = flake.size * scale;
    gfx.drawImage(flake.img, -s / 2, -s / 2, s, s);
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
    if (t < DURATION) return;
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
