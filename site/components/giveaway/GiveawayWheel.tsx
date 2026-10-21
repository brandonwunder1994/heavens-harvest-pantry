"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { spinWheel } from "@/app/owner/giveaway-actions";

/**
 * The draw wheel. Until draw day the server sends only "Entry 1, Entry 2…" and
 * the names are blurred on top of that, so nobody's details are in the page.
 * Only the signed-in owner gets a Spin button, and the winner is chosen by the
 * server; the wheel just turns to land on whoever it names.
 *
 * With no entries yet it shows a sample wheel of "Your name" slices. Whenever it
 * is not being drawn it turns slowly on its own, so the page feels alive.
 */
export type WheelSegment = { id: number; label: string };

const COLORS = ["#5b3d1e", "#6b7a4a", "#c9a06a", "#3f2a14", "#a9b18a", "#8a6a3e"];
const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 188;
const SPIN_MS = 7000;
const IDLE_DEGREES_PER_SECOND = 5;
const SAMPLE: WheelSegment[] = Array.from({ length: 10 }, (_, i) => ({ id: -(i + 1), label: "Your name" }));

const point = (angle: number, radius: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)] as const;
};

function slicePath(index: number, count: number): string {
  const step = 360 / count;
  const [x1, y1] = point(index * step, RADIUS);
  const [x2, y2] = point((index + 1) * step, RADIUS);
  return `M${CENTER} ${CENTER} L${x1.toFixed(2)} ${y1.toFixed(2)} A${RADIUS} ${RADIUS} 0 ${step > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/** The turn that puts the middle of slice `index` under the pointer at the top. */
const restingAngle = (index: number, count: number) => 360 - (index + 0.5) * (360 / count);

export function GiveawayWheel({
  segments: real,
  revealed,
  isOwner,
  winnerId,
}: {
  segments: WheelSegment[];
  revealed: boolean;
  isOwner: boolean;
  winnerId: number | null;
}) {
  const sample = real.length === 0;
  const segments = sample ? SAMPLE : real;
  const count = segments.length;
  const step = 360 / count;
  const showLabels = count <= 60;
  const blurred = !revealed && !sample;

  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(winnerId);
  const [announce, setAnnounce] = useState(winnerId !== null);
  const [problem, setProblem] = useState("");
  const [, startTransition] = useTransition();

  const wheel = useRef<SVGSVGElement>(null);
  const initialIndex = winnerId !== null ? segments.findIndex((s) => s.id === winnerId) : -1;
  const [startAngle] = useState(() => (initialIndex >= 0 ? restingAngle(initialIndex, count) : 0));
  const angle = useRef(startAngle);

  // The slow idle turn, until there is a winner to hold on or a spin under way.
  useEffect(() => {
    if (spinning || winner !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      angle.current += ((now - last) / 1000) * IDLE_DEGREES_PER_SECOND;
      last = now;
      if (wheel.current) wheel.current.style.transform = `rotate(${angle.current}deg)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinning, winner]);

  const winnerLabel = segments.find((s) => s.id === winner)?.label ?? "";

  function spin() {
    if (spinning || sample) return;
    setProblem("");
    setAnnounce(false);
    startTransition(async () => {
      const result = await spinWheel();
      if (!result.ok) {
        setProblem(result.message);
        return;
      }
      const index = segments.findIndex((s) => s.id === result.id);
      const el = wheel.current;
      if (index < 0 || !el) {
        setProblem("The winner is not on this wheel yet. Reload the page and spin again.");
        return;
      }
      const current = angle.current;
      const target = current + 360 * 7 + ((((360 - (index + 0.5) * step - (current % 360)) % 360) + 360) % 360);
      angle.current = target;
      setWinner(result.id);
      setSpinning(true);
      el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.6, 0.08, 1)`;
      void el.getBoundingClientRect(); // commit the starting turn before the long one
      el.style.transform = `rotate(${target}deg)`;
    });
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full max-w-[460px]">
        {/* The pointer */}
        <svg viewBox="0 0 40 48" aria-hidden="true" className="absolute left-1/2 top-[-14px] z-10 h-12 w-10 -translate-x-1/2 drop-shadow">
          <path d="M20 46 L4 6 Q20 -2 36 6 Z" fill="#c9a06a" stroke="#3f2a14" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>

        <svg
          ref={wheel}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            sample
              ? "A sample prize wheel. Verified entries will appear on it."
              : revealed
                ? `A wheel with ${count} verified ${count === 1 ? "entry" : "entries"}.`
                : `A wheel with ${count} verified ${count === 1 ? "entry" : "entries"}. Names are hidden until draw day.`
          }
          className="w-full"
          style={{ transform: `rotate(${startAngle}deg)` }}
          onTransitionEnd={() => {
            if (wheel.current) wheel.current.style.transition = "none";
            setSpinning(false);
            setAnnounce(true);
          }}
        >
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 8} fill="#3f2a14" />
          {count === 1 ? (
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={COLORS[0]} />
          ) : (
            segments.map((segment, index) => (
              <path key={segment.id} d={slicePath(index, count)} fill={COLORS[index % COLORS.length]} stroke="#fbf8f1" strokeWidth={count > 80 ? 0.5 : 1.5} />
            ))
          )}

          {showLabels ? (
            <g style={blurred ? { filter: "blur(6px)" } : undefined} aria-hidden={blurred ? true : undefined}>
              {segments.map((segment, index) => {
                const mid = (index + 0.5) * step;
                const [x, y] = point(mid, RADIUS - 16);
                const light = [2, 4].includes(index % COLORS.length);
                return (
                  <text
                    key={segment.id}
                    x={x}
                    y={y}
                    transform={`rotate(${mid + 90} ${x} ${y})`}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={count > 30 ? 9 : count > 16 ? 12 : 16}
                    fontFamily="Karla, system-ui, sans-serif"
                    fontWeight={600}
                    fill={light ? "#3a2712" : "#fbf8f1"}
                  >
                    {segment.label.length > 16 ? `${segment.label.slice(0, 15)}…` : segment.label}
                  </text>
                );
              })}
            </g>
          ) : null}

          <circle cx={CENTER} cy={CENTER} r={26} fill="#fbf8f1" stroke="#3f2a14" strokeWidth={4} />
        </svg>
      </div>

      {sample ? (
        <p className="max-w-md text-center font-ui text-[14px] font-semibold text-sage-deep">
          Be the first name on the wheel. Verified entries show up here.
        </p>
      ) : (
        <p className="font-ui text-[14px] font-semibold text-sage-deep">
          {count} verified {count === 1 ? "entry" : "entries"} on the wheel
        </p>
      )}

      {!revealed && !sample ? (
        <p className="max-w-md text-center font-ui text-[13px] leading-relaxed text-muted">
          Names stay hidden to protect everyone&apos;s privacy. They show on draw day, when we spin it live.
        </p>
      ) : null}

      {isOwner && revealed && !sample ? (
        <button type="button" onClick={spin} disabled={spinning} className="stamp disabled:opacity-60">
          {spinning ? "Spinning…" : winner !== null ? "Spin again" : "Spin the wheel"}
        </button>
      ) : null}
      {isOwner && !revealed && !sample ? (
        <p className="max-w-md text-center font-ui text-[13px] text-brown">
          Owner: turn on &ldquo;Show names on the wheel&rdquo; on your Giveaway page to reveal the names and spin.
        </p>
      ) : null}

      <p role="alert" className="min-h-5 font-ui text-[13px] font-semibold text-brown">
        {problem}
      </p>

      {revealed && announce && winner !== null && winnerLabel ? (
        <div role="status" className="dashed-frame bg-paper px-8 py-6 text-center">
          <div className="small-caps">This month&apos;s winner</div>
          <p className="display mt-1 text-[34px] italic leading-tight sm:text-[44px]">{winnerLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
