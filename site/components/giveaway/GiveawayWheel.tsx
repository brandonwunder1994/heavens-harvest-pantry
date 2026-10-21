"use client";

import { useRef, useState, useTransition } from "react";
import { spinWheel } from "@/app/owner/giveaway-actions";

/**
 * The draw wheel. Until draw day the server sends only "Entry 1, Entry 2…" and
 * the names are blurred on top of that, so nobody's details are in the page.
 * Only the signed-in owner gets a Spin button, and the winner is chosen by the
 * server; the wheel just turns to land on whoever it names.
 */
export type WheelSegment = { id: number; label: string };

const COLORS = ["#5b3d1e", "#6b7a4a", "#c9a06a", "#3f2a14", "#a9b18a", "#8a6a3e"];
const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 188;
const SPIN_MS = 7000;

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

export function GiveawayWheel({
  segments,
  revealed,
  isOwner,
  winnerId,
}: {
  segments: WheelSegment[];
  revealed: boolean;
  isOwner: boolean;
  winnerId: number | null;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(winnerId);
  const [announce, setAnnounce] = useState(winnerId !== null);
  const [problem, setProblem] = useState("");
  const [, startTransition] = useTransition();
  const turned = useRef(0);

  const count = segments.length;
  const step = count > 0 ? 360 / count : 360;
  const showLabels = count > 0 && count <= 60;
  const winnerLabel = segments.find((s) => s.id === winner)?.label ?? "";

  function spin() {
    if (spinning || count === 0) return;
    setProblem("");
    setAnnounce(false);
    startTransition(async () => {
      const result = await spinWheel();
      if (!result.ok) {
        setProblem(result.message);
        return;
      }
      const index = segments.findIndex((s) => s.id === result.id);
      if (index < 0) {
        setProblem("The winner is not on this wheel yet. Reload the page and spin again.");
        return;
      }
      // Land the middle of the winner's slice under the pointer at the top.
      const centre = (index + 0.5) * step;
      const current = turned.current;
      const target = current + 360 * 7 + ((360 - centre - (current % 360)) % 360 + 360) % 360;
      turned.current = target;
      setWinner(result.id);
      setSpinning(true);
      setRotation(target);
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
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            revealed
              ? `A wheel with ${count} verified ${count === 1 ? "entry" : "entries"}.`
              : `A wheel with ${count} verified ${count === 1 ? "entry" : "entries"}. Names are hidden until draw day.`
          }
          className="w-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.6, 0.08, 1)` : "none",
          }}
          onTransitionEnd={() => {
            setSpinning(false);
            setAnnounce(true);
          }}
        >
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 8} fill="#3f2a14" />
          {count === 0 ? (
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#eadfcc" />
          ) : count === 1 ? (
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={COLORS[0]} />
          ) : (
            segments.map((segment, index) => (
              <path key={segment.id} d={slicePath(index, count)} fill={COLORS[index % COLORS.length]} stroke="#fbf8f1" strokeWidth={count > 80 ? 0.5 : 1.5} />
            ))
          )}

          {showLabels ? (
            <g style={revealed ? undefined : { filter: "blur(6px)" }} aria-hidden={revealed ? undefined : true}>
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

      {count === 0 ? (
        <p className="max-w-md text-center font-ui text-[14px] text-muted">
          The wheel fills up as entries are verified. Check back closer to the draw.
        </p>
      ) : (
        <p className="font-ui text-[14px] font-semibold text-sage-deep">
          {count} verified {count === 1 ? "entry" : "entries"} on the wheel
        </p>
      )}

      {!revealed && count > 0 ? (
        <p className="max-w-md text-center font-ui text-[13px] leading-relaxed text-muted">
          Names stay hidden to protect everyone&apos;s privacy. They show on draw day, when we spin it live.
        </p>
      ) : null}

      {isOwner && revealed && count > 0 ? (
        <button type="button" onClick={spin} disabled={spinning} className="stamp disabled:opacity-60">
          {spinning ? "Spinning…" : winner !== null ? "Spin again" : "Spin the wheel"}
        </button>
      ) : null}
      {isOwner && !revealed ? (
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
