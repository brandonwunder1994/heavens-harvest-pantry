"use client";

import Link from "@/components/ShopLink";
import { useState, type CSSProperties, type PointerEvent } from "react";
import "./rewards-card.css";

const SLOTS = 10;
const COLS = 5;
const XS = [16.6, 33.3, 50, 66.7, 83.4];
const YS = [54.5, 78];
/** Same heart as the shop sprite, so the punch matches the rest of the pantry. */
const HEART =
  "M12 21s-7.5-4.6-9.6-9.1C.8 8.3 3 4.5 6.6 4.5c2 0 3.6 1.1 4.4 2.6.8-1.5 2.4-2.6 4.4-2.6 3.6 0 5.8 3.8 4.2 7.4C19.5 16.4 12 21 12 21z";

export function RewardsCard({
  punched = 9,
  line = "One more for a free bag",
  href,
}: {
  punched?: number;
  line?: string;
  href?: string;
}) {
  const cuts = Math.max(0, Math.min(SLOTS, punched));
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 42, y: 22 });

  const stageVars = {
    "--rx": `${tilt.x}deg`,
    "--ry": `${tilt.y}deg`,
    "--shine-x": `${shine.x}%`,
    "--shine-y": `${shine.y}%`,
    "--sx": `${tilt.y * -0.55}px`,
    "--sy": `${4 + tilt.x * 0.4}px`,
    "--ss": tilt.x === 0 && tilt.y === 0 ? 1 : 1.08,
  } as CSSProperties;

  const faceVars = {
    WebkitMaskImage: holeMask(cuts),
    maskImage: holeMask(cuts),
  } as CSSProperties;

  function follow(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width;
    const py = (event.clientY - box.top) / box.height;
    setTilt({ x: (0.5 - py) * 7, y: (px - 0.5) * 10 });
    setShine({ x: px * 100, y: py * 100 });
  }

  function rest() {
    setTilt({ x: 0, y: 0 });
    setShine({ x: 42, y: 22 });
  }

  const inner = (
    <>
      <span className="punch-shadow" aria-hidden />
      <span className="punch-card">
        <span className="punch-face" style={faceVars}>
          {/* Paper tooth lives in the file. Next's optimizer would flatten it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rewards/card-stock.jpg"
            alt=""
            width={1280}
            height={720}
            className="punch-stock"
          />
        </span>
        <span className="punch-ink">
          <span className="punch-title">Pantry Rewards</span>
          <span className="punch-line">{line}</span>
        </span>
        <span className="punch-board">
          {Array.from({ length: SLOTS }, (_, i) => {
            const cut = i < cuts;
            return (
              <span
                key={i}
                className={cut ? "punch-hole" : "punch-target"}
                style={slotStyle(i)}
                data-last={cut && i === cuts - 1 ? "yes" : undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                  <path d={HEART} />
                </svg>
              </span>
            );
          })}
        </span>
        {cuts > 0 ? (
          <span className="punch-chad" aria-hidden>
            <svg viewBox="0 0 24 24" focusable="false">
              <path d={HEART} />
            </svg>
          </span>
        ) : null}
        <span className="punch-sheen" aria-hidden />
      </span>
    </>
  );

  const label = `${cuts} of ${SLOTS} punches. ${line}.`;

  if (href) {
    return (
      <Link
        href={href}
        className="punch-stage"
        style={stageVars}
        aria-label={label}
        onPointerMove={follow}
        onPointerLeave={rest}
        onBlur={rest}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className="punch-stage"
      style={stageVars}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerMove={follow}
      onPointerLeave={rest}
      onBlur={rest}
    >
      {inner}
    </div>
  );
}

function slotStyle(i: number): CSSProperties {
  return {
    left: `${XS[i % COLS]}%`,
    top: `${YS[i < COLS ? 0 : 1]}%`,
    "--rot": `${((i * 37) % 17) - 8}deg`,
    "--i": i,
  } as CSSProperties;
}

function holeMask(count: number): string {
  const punches = Array.from({ length: count }, (_, i) => {
    const cx = (16 * XS[i % COLS]).toFixed(1);
    const cy = (9 * YS[i < COLS ? 0 : 1]).toFixed(1);
    const scale = (6.15 + (i % 3) * 0.12).toFixed(2);
    const rot = ((i * 37) % 17) - 8;
    return `<path transform="translate(${cx} ${cy}) rotate(${rot}) scale(${scale}) translate(-12 -13)" d="${HEART}" fill="black"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="white"/>${punches}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
