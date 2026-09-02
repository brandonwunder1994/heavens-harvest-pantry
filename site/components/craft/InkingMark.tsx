"use client";

import { useEffect, useRef } from "react";

/**
 * The cross-and-wheat mark, inking itself onto the page once.
 *
 * Two seconds on a first visit, and then never again for that person. The
 * restraint is the point: an animation that replays on every page load stops
 * being a moment and becomes furniture.
 *
 * The strokes are drawn inline rather than pulled from the sprite, because a
 * `<use>` reference cannot have its individual paths animated from outside.
 * The geometry is the same one in `components/Sprite.tsx` — if that mark ever
 * changes, this one changes with it.
 */

const SEEN = "hhp-mark-inked";

/** Each stroke's own length, so all four finish together rather than in a race. */
const STROKES: { d: string; len: number }[] = [
  { d: "M30 8 v44", len: 46 },
  { d: "M18 22 h24", len: 26 },
  { d: "M9 52 c 1 -16 5 -24 13 -33", len: 42 },
  { d: "M51 52 c -1 -16 -5 -24 -13 -33", len: 42 },
];

const GRAINS = [
  { cx: 12, cy: 41, turn: -22 },
  { cx: 15, cy: 32, turn: -22 },
  { cx: 19, cy: 24, turn: -22 },
  { cx: 48, cy: 41, turn: 22 },
  { cx: 45, cy: 32, turn: 22 },
  { cx: 41, cy: 24, turn: 22 },
];

export function InkingMark({ size = 72, color = "#c9a06a" }: { size?: number; color?: string }) {
  const mark = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = mark.current;
    if (!svg) return;

    let inked = true;
    try {
      inked = window.localStorage.getItem(SEEN) === "1";
    } catch {
      // A private window with storage blocked simply never gets the animation,
      // which is the safer way round: it can only ever under-play, never repeat.
    }

    if (inked) {
      svg.classList.add("still");
      return;
    }

    svg.classList.add("draw");
    try {
      window.localStorage.setItem(SEEN, "1");
    } catch {
      /* nothing to remember it with; see above */
    }
  }, []);

  return (
    <>
      {/* With JavaScript off nothing decides, so the mark is simply there. */}
      <noscript>
        <style>{".inkmark path{stroke-dashoffset:0}.inkmark ellipse{opacity:1}"}</style>
      </noscript>

      <svg
        ref={mark}
        className="inkmark"
        width={size}
        height={size}
        viewBox="0 0 60 60"
        style={{ color }}
        aria-hidden
        focusable="false"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          {STROKES.map((stroke) => (
            <path
              key={stroke.d}
              d={stroke.d}
              style={{ "--len": stroke.len } as React.CSSProperties}
            />
          ))}
        </g>
        <g fill={color} stroke="none">
          {GRAINS.map((grain) => (
            <ellipse
              key={`${grain.cx}-${grain.cy}`}
              cx={grain.cx}
              cy={grain.cy}
              rx="3"
              ry="4.6"
              transform={`rotate(${grain.turn} ${grain.cx} ${grain.cy})`}
            />
          ))}
        </g>
      </svg>
    </>
  );
}
