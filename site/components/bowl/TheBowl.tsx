"use client";

// The bowl.
//
// A toy with nothing to buy. Drag granola, yoghurt and berries into a bowl,
// make the breakfast you would actually make, and save the picture.
//
// Dragging is the nice part, not the mechanism: every ingredient is a button
// as well, so a thumb, a trackpad, a keyboard and a screen reader can all make
// a bowl. Nothing is uploaded and nothing is saved anywhere — the picture is
// made in the browser and handed straight to whoever asked for it.

import { useCallback, useEffect, useRef, useState } from "react";

const WIDE = 640;
const TALL = 640;
const BOWL = { x: WIDE / 2, y: TALL * 0.55, rx: 235, ry: 175 };

type Kind = "yoghurt" | "granola" | "berries" | "honey";

type Blob = { kind: Kind; x: number; y: number; seed: number };

const THINGS: { kind: Kind; name: string; hint: string }[] = [
  { kind: "yoghurt", name: "Yoghurt", hint: "A spoonful" },
  { kind: "granola", name: "Granola", hint: "A good handful" },
  { kind: "berries", name: "Berries", hint: "Whatever is in the fridge" },
  { kind: "honey", name: "Honey", hint: "A drizzle" },
];

/** A steady little random, so a bowl looks the same every time it is redrawn. */
function rnd(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const OATS = ["#d9b979", "#bd8843", "#94612c", "#5a3616", "#e7d5ab"];
const FRUIT = ["#8d2f4a", "#3b3f6e", "#a83b3b", "#5a2c58"];

function paintBlob(g: CanvasRenderingContext2D, blob: Blob) {
  const r = rnd(blob.seed);

  if (blob.kind === "yoghurt") {
    // A spoonful is soft-edged and slightly domed. Overlapping blurred lobes
    // read as that; the straight edges a polygon gives read as cut paper.
    // The shadow first, so the spoonful sits in the bowl instead of floating.
    g.save();
    g.filter = "blur(9px)";
    g.fillStyle = "rgba(104, 80, 46, 0.34)";
    g.beginPath();
    g.ellipse(blob.x, blob.y + 12, 62, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    g.save();
    // Barely blurred. Any softer and a spoonful reads as a light left on.
    g.filter = "blur(2.5px)";
    for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2;
      const far = r() * 30;
      // White, not cream. Against a cream bowl anything softer disappears.
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(
        blob.x + Math.cos(a) * far,
        blob.y + Math.sin(a) * far * 0.6,
        38 + r() * 20,
        27 + r() * 12,
        r() * 2,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    g.restore();

    // A little light on top, so it is a dome rather than a puddle.
    g.save();
    g.filter = "blur(6px)";
    g.fillStyle = "rgba(240,232,214,0.85)";
    g.beginPath();
    g.ellipse(blob.x + 6, blob.y + 14, 34, 15, 0.2, 0, Math.PI * 2);
    g.fill();
    g.restore();
    return;
  }

  if (blob.kind === "granola") {
    g.save();
    g.shadowColor = "rgba(92, 64, 30, 0.3)";
    g.shadowBlur = 5;
    g.shadowOffsetY = 2;
    for (let i = 0; i < 38; i++) {
      const a = r() * Math.PI * 2;
      const far = Math.sqrt(r()) * 56;
      const x = blob.x + Math.cos(a) * far;
      const y = blob.y + Math.sin(a) * far * 0.6;
      const size = 9 + r() * 10;
      g.save();
      g.translate(x, y);
      g.rotate(r() * Math.PI);
      g.fillStyle = OATS[Math.floor(r() * OATS.length)];
      g.beginPath();
      const bumps = 6;
      for (let k = 0; k <= bumps; k++) {
        const t = (k / bumps) * Math.PI * 2;
        const wob = size * (0.72 + r() * 0.5);
        const px = Math.cos(t) * wob;
        const py = Math.sin(t) * wob * 0.8;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
      g.restore();
    }
    g.restore();
    return;
  }

  if (blob.kind === "berries") {
    g.save();
    g.shadowColor = "rgba(70, 40, 40, 0.35)";
    g.shadowBlur = 6;
    g.shadowOffsetY = 3;
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const far = Math.sqrt(r()) * 44;
      const x = blob.x + Math.cos(a) * far;
      const y = blob.y + Math.sin(a) * far * 0.6;
      const size = 11 + r() * 7;
      g.fillStyle = FRUIT[Math.floor(r() * FRUIT.length)];
      g.beginPath();
      g.ellipse(x, y, size, size * 0.92, r() * 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.beginPath();
      g.ellipse(x - size * 0.3, y - size * 0.35, size * 0.24, size * 0.18, -0.6, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    return;
  }

  // Honey, poured in a loose coil, which is how it actually falls.
  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  g.shadowColor = "rgba(150, 100, 20, 0.28)";
  g.shadowBlur = 5;
  g.shadowOffsetY = 2;
  g.beginPath();
  const turns = 2.1 + r() * 0.8;
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    const far = 10 + t * 40;
    const x = blob.x + Math.cos(a) * far;
    const y = blob.y + Math.sin(a) * far * 0.58;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokeStyle = "rgba(199,141,45,0.85)";
  g.lineWidth = 7;
  g.stroke();
  g.shadowColor = "transparent";
  g.strokeStyle = "rgba(255,214,131,0.8)";
  g.lineWidth = 2.6;
  g.stroke();
  g.restore();
}

/**
 * Somewhere inside the bowl, biased to the middle so it looks like a bowl.
 *
 * Out here rather than in the component because a bowl is only ever added to
 * from a press or a drop, never while React is drawing — and saying so at the
 * top level is how the linter can tell.
 */
function somewhere(): { x: number; y: number } {
  // Well inside the rim: breakfast goes in the middle of a bowl, and a pile
  // spread out to the edges looks like a spill.
  const a = Math.random() * Math.PI * 2;
  const far = Math.sqrt(Math.random()) * 0.38;
  return { x: BOWL.x + Math.cos(a) * BOWL.rx * far, y: BOWL.y + Math.sin(a) * BOWL.ry * far };
}

const aSeed = () => Math.floor(Math.random() * 1e9);

export function TheBowl() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [carrying, setCarrying] = useState<Kind | null>(null);
  const [saved, setSaved] = useState(false);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== WIDE * dpr) {
      canvas.width = WIDE * dpr;
      canvas.height = TALL * dpr;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.fillStyle = "#f4eee2";
    g.fillRect(0, 0, WIDE, TALL);

    // The shadow the bowl sits in.
    g.save();
    g.fillStyle = "rgba(120, 92, 54, 0.13)";
    g.beginPath();
    g.ellipse(BOWL.x, BOWL.y + BOWL.ry * 0.72, BOWL.rx * 0.96, BOWL.ry * 0.3, 0, 0, Math.PI * 2);
    g.filter = "blur(10px)";
    g.fill();
    g.restore();

    // The bowl: the inside first, so everything dropped in sits on it.
    g.save();
    const inside = g.createLinearGradient(0, BOWL.y - BOWL.ry, 0, BOWL.y + BOWL.ry);
    inside.addColorStop(0, "#e8dfcd");
    inside.addColorStop(1, "#d6c9b0");
    g.fillStyle = inside;
    g.beginPath();
    g.ellipse(BOWL.x, BOWL.y, BOWL.rx, BOWL.ry, 0, 0, Math.PI * 2);
    g.fill();

    // Darker where the wall curves away, or it reads as a plate.
    const hollow = g.createRadialGradient(
      BOWL.x,
      BOWL.y - BOWL.ry * 0.12,
      BOWL.rx * 0.18,
      BOWL.x,
      BOWL.y,
      BOWL.rx,
    );
    hollow.addColorStop(0, "rgba(120, 92, 54, 0)");
    hollow.addColorStop(0.72, "rgba(120, 92, 54, 0.07)");
    hollow.addColorStop(1, "rgba(96, 72, 40, 0.28)");
    g.fillStyle = hollow;
    g.beginPath();
    g.ellipse(BOWL.x, BOWL.y, BOWL.rx, BOWL.ry, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // Everything in it, clipped to the bowl so nothing spills onto the counter.
    g.save();
    g.beginPath();
    g.ellipse(BOWL.x, BOWL.y, BOWL.rx - 8, BOWL.ry - 8, 0, 0, Math.PI * 2);
    g.clip();
    for (const blob of blobs) paintBlob(g, blob);
    g.restore();

    // The rim, over the top of it.
    g.save();
    g.strokeStyle = "#c3b294";
    g.lineWidth = 9;
    g.beginPath();
    g.ellipse(BOWL.x, BOWL.y, BOWL.rx, BOWL.ry, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(255,252,244,0.75)";
    g.lineWidth = 2.4;
    g.beginPath();
    g.ellipse(BOWL.x, BOWL.y - 2, BOWL.rx - 3, BOWL.ry - 3, 0, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    g.restore();
  }, [blobs]);

  useEffect(() => {
    paint();
  }, [paint]);

  function drop(kind: Kind, at?: { x: number; y: number }) {
    const where = at ?? somewhere();
    setBlobs((prev) => [...prev, { kind, x: where.x, y: where.y, seed: aSeed() }]);
    setSaved(false);
  }

  function pointIn(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * WIDE;
    const y = ((event.clientY - box.top) / box.height) * TALL;
    // Only inside the bowl. A spoonful of yoghurt on the counter helps nobody.
    const dx = (x - BOWL.x) / (BOWL.rx - 20);
    const dy = (y - BOWL.y) / (BOWL.ry - 20);
    return dx * dx + dy * dy <= 1 ? { x, y } : null;
  }

  function keep() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((made) => {
      if (!made) return;
      const url = URL.createObjectURL(made);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-bowl.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Let the browser start the save before the URL is taken away.
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setSaved(true);
    }, "image/png");
  }

  return (
    <div className="bowl" data-carrying={carrying ?? undefined}>
      <div className="bowl-tray" role="group" aria-label="What to put in it">
        {THINGS.map((thing) => (
          <button
            key={thing.kind}
            type="button"
            className="bowl-thing"
            data-kind={thing.kind}
            draggable={false}
            onPointerDown={() => setCarrying(thing.kind)}
            onPointerUp={() => setCarrying(null)}
            onPointerCancel={() => setCarrying(null)}
            onClick={() => drop(thing.kind)}
          >
            <span className="bowl-thing-name">{thing.name}</span>
            <span className="bowl-thing-hint">{thing.hint}</span>
          </button>
        ))}
      </div>

      <div className="bowl-middle">
        <canvas
          ref={canvasRef}
          className="bowl-glass"
          role="img"
          aria-label={
            blobs.length === 0
              ? "An empty bowl."
              : `A bowl with ${blobs.length} ${blobs.length === 1 ? "thing" : "things"} in it.`
          }
          onPointerUp={(event) => {
            if (!carrying) return;
            const at = pointIn(event);
            if (at) drop(carrying, at);
            setCarrying(null);
          }}
          onPointerLeave={() => setCarrying(null)}
        />

        <div className="bowl-tools">
          <button
            type="button"
            className="bowl-quiet"
            onClick={() => {
              setBlobs((prev) => prev.slice(0, -1));
              setSaved(false);
            }}
            disabled={blobs.length === 0}
          >
            Take one out
          </button>
          <button
            type="button"
            className="bowl-quiet"
            onClick={() => {
              setBlobs([]);
              setSaved(false);
            }}
            disabled={blobs.length === 0}
          >
            Start again
          </button>
          <button
            type="button"
            className="stamp !min-h-10 !px-5 !text-[10px]"
            onClick={keep}
            disabled={blobs.length === 0}
          >
            {saved ? "Saved" : "Save the picture"}
          </button>
        </div>

        <p className="bowl-hint">
          Drag something in, or just press it. Nothing here is uploaded anywhere — the picture is made on
          your own machine.
        </p>
      </div>
    </div>
  );
}
