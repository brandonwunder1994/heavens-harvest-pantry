'use client';

// Oat grass along the bottom of every page, so the closing blessing has a
// horizon to sit above instead of stopping at the edge of the paper.
//
// It bends away from the cursor and rights itself. There is no ambient sway:
// grass that moves on its own means a loop running for as long as the page is
// open, and the only thing worth that is a hand actually passing over it. When
// nobody is near it, nothing is drawn and nothing is listening.

import { useEffect, useRef } from 'react';

const REACH = 230;      // how far the cursor is felt, in pixels
const LEAN = 0.9;       // how far a stalk will bend at the very worst
const SPRING = 11;
const DRAG = 5.2;
const STILL = 0.0012;

// Dry oat and the sage from her logo, low against the cream so it reads as a
// hem rather than a hedge. The back row is paler, which is the whole of the
// depth in this drawing.
const STEM = ['#8d9265', '#7d8757', '#9aa075', '#a08c5c', '#8a7a4e'];
const BACK = ['#bcc0a2', '#c4c4a8', '#c8bd9a', '#b9bb9c'];
const GRAIN = ['#c6b184', '#d3c095', '#b9a274', '#cbbd93'];
const GRAIN_BACK = ['#dcd3b4', '#e0d8bd', '#d5c9a8'];

type Stalk = {
  x: number;
  h: number;
  lean: number;
  bend: number;
  vel: number;
  width: number;
  stem: string;
  grain: string;
  /** Oats hang in a loose spray; plenty of blades carry none at all. */
  oats: number;
  flip: number;
  back: boolean;
};

export function WheatHem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Both are re-bound after the guard: TypeScript forgets a narrowing once
    // the value is read inside a hoisted function, and every one of these is.
    const el = canvasRef.current;
    if (!el) return;
    const surface = el.getContext('2d');
    if (!surface) return;
    const canvas = el;
    const g = surface;

    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let stalks: Stalk[] = [];
    let width = 0;
    let tall = 0;
    let raf = 0;
    let last = 0;
    let listening = false;
    let pointer = -1e4;

    // A seeded scatter, so the hem is the same shape on every page rather than
    // reshuffling itself as someone moves around the site.
    let seed = 0x6f61;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    function sow() {
      seed = 0x6f61;
      stalks = [];
      const gap = width < 640 ? 9 : 11;
      const n = Math.max(14, Math.round(width / gap));
      for (let i = 0; i < n; i++) {
        const back = rnd() < 0.45;
        // Nothing reaches the top of the strip: a blade clipped by the edge of
        // its own canvas looks like a mistake, and the oats need headroom.
        const h = tall * (back ? 0.24 + rnd() * 0.3 : 0.34 + Math.pow(rnd(), 1.5) * 0.42);
        stalks.push({
          x: (i + 0.5) * (width / n) + (rnd() - 0.5) * gap * 1.1,
          h,
          lean: (rnd() - 0.5) * (back ? 0.5 : 0.36),
          bend: 0,
          vel: 0,
          width: (back ? 1.3 : 2.1) + rnd() * 1.2,
          stem: back ? BACK[Math.floor(rnd() * BACK.length)] : STEM[Math.floor(rnd() * STEM.length)],
          grain: back ? GRAIN_BACK[Math.floor(rnd() * GRAIN_BACK.length)] : GRAIN[Math.floor(rnd() * GRAIN.length)],
          oats: rnd() < (back ? 0.18 : 0.44) ? 3 + Math.floor(rnd() * 4) : 0,
          flip: rnd() < 0.5 ? -1 : 1,
          back,
        });
      }
      // Back row first, then the front, so the pale ones stay behind.
      stalks.sort((a, b) => Number(b.back) - Number(a.back) || a.h - b.h);
    }

    /** Where a blade is at height fraction `f`, given how far it is bending. */
    function along(s: Stalk, sway: number, f: number) {
      return { x: s.x + sway * f * f * s.h, y: tall - f * s.h };
    }

    function draw() {
      g.clearRect(0, 0, width, tall);

      for (const s of stalks) {
        const sway = s.lean + s.bend;

        // A blade, not a wire: two edges that meet at the tip, so it is wide
        // and dark where it leaves the ground and disappears to nothing.
        g.fillStyle = s.stem;
        g.beginPath();
        const STEPS = 10;
        for (let i = 0; i <= STEPS; i++) {
          const f = i / STEPS;
          const p = along(s, sway, f);
          const w = (s.width * (1 - f) ** 1.4) / 2;
          if (i === 0) g.moveTo(p.x - w, p.y);
          else g.lineTo(p.x - w, p.y);
        }
        for (let i = STEPS; i >= 0; i--) {
          const f = i / STEPS;
          const p = along(s, sway, f);
          const w = (s.width * (1 - f) ** 1.4) / 2;
          g.lineTo(p.x + w, p.y);
        }
        g.closePath();
        g.fill();

        if (!s.oats) continue;

        // The head, as one shape rather than a spray of separate grains.
        // A hundred-pixel strip cannot hold individual oats — drawn that way
        // they collapse into a knot on a stick — so it is a slim spindle up
        // the last third of the blade, notched, with two awns off the tip.
        const FOOT = 0.62;
        const fat = (s.back ? 2.4 : 3.4) + s.h * 0.012;
        const edge = (u: number) => fat * Math.sin(Math.PI * Math.min(1, u) ** 0.78);

        g.fillStyle = s.grain;
        g.beginPath();
        const HEAD = 12;
        for (let i = 0; i <= HEAD; i++) {
          const u = i / HEAD;
          const p = along(s, sway, FOOT + (1 - FOOT) * u);
          const w = edge(u);
          if (i === 0) g.moveTo(p.x - w, p.y);
          else g.lineTo(p.x - w, p.y);
        }
        for (let i = HEAD; i >= 0; i--) {
          const u = i / HEAD;
          const p = along(s, sway, FOOT + (1 - FOOT) * u);
          g.lineTo(p.x + edge(u), p.y);
        }
        g.closePath();
        g.fill();

        // Notches, so it is a head of grain and not a leaf.
        g.strokeStyle = s.back ? '#cfc6a4' : '#a89468';
        g.lineWidth = 0.7;
        for (let k = 1; k < s.oats; k++) {
          const u = k / s.oats;
          const p = along(s, sway, FOOT + (1 - FOOT) * u);
          const w = edge(u);
          g.beginPath();
          g.moveTo(p.x - w, p.y + 1.1);
          g.lineTo(p.x + w, p.y - 0.5);
          g.stroke();
        }

        // Two awns off the top, which is the whole silhouette of a cereal.
        if (!s.back) {
          const tip = along(s, sway, 1);
          g.strokeStyle = s.grain;
          g.lineWidth = 0.7;
          for (const side of [-1, 1]) {
            g.beginPath();
            g.moveTo(tip.x, tip.y + 1);
            g.quadraticCurveTo(
              tip.x + side * 2.4 + sway * 3,
              tip.y - 4.5,
              tip.x + side * 4.6 + sway * 5,
              tip.y - 8.5,
            );
            g.stroke();
          }
        }
      }
    }

    function step(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;

      let busy = false;
      for (const s of stalks) {
        const d = Math.abs(s.x - pointer);
        let push = 0;
        if (d < REACH) {
          const near = 1 - d / REACH;
          push = Math.sign(s.x - pointer || 1) * Math.pow(near, 1.35) * LEAN * SPRING;
        }
        s.vel += (-SPRING * s.bend - DRAG * s.vel + push) * dt;
        s.bend += s.vel * dt;

        // Settled means settled *where the cursor is holding it*, not upright.
        // Comparing against zero would redraw the same frame forever while a
        // mouse sits parked over the grass.
        const held = push / SPRING;
        if (Math.abs(s.bend - held) > STILL || Math.abs(s.vel) > STILL) busy = true;
        else { s.bend = held; s.vel = 0; }
      }

      draw();
      raf = busy ? requestAnimationFrame(step) : 0;
      if (!busy) last = 0;
    }

    function wake() {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(step);
    }

    function onMove(event: PointerEvent) {
      const box = canvas.getBoundingClientRect();
      // Felt from a little way above, so the grass reacts as the cursor comes
      // down the page rather than only once it is inside the strip.
      if (event.clientY < box.top - REACH || event.clientY > box.bottom + 40) {
        if (pointer > -1e3) { pointer = -1e4; wake(); }
        return;
      }
      pointer = event.clientX - box.left;
      wake();
    }

    function measure() {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(box.width));
      tall = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(tall * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      sow();
      draw();
    }

    measure();

    const resize = new ResizeObserver(measure);
    resize.observe(canvas);

    // Nothing listens while the foot of the page is out of sight, which on most
    // pages is nearly all of the time.
    const seen = new IntersectionObserver((entries) => {
      const showing = entries.some((e) => e.isIntersecting);
      if (showing === listening) return;
      listening = showing;
      if (showing && !calm) {
        window.addEventListener('pointermove', onMove, { passive: true });
      } else {
        window.removeEventListener('pointermove', onMove);
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }, { rootMargin: '80px' });
    seen.observe(canvas);

    return () => {
      resize.disconnect();
      seen.disconnect();
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="wheat-hem" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
