"use client";

// The paper the card comes in.
//
// Pull the string and it comes off. That is the whole of it — one drag, or one
// press of the button under it, or the Enter key, because a card that can only
// be opened by dragging is a card some people cannot open.
//
// The card underneath is rendered by the server and is simply hidden behind the
// paper, so somebody with no JavaScript, or with motion switched off, sees the
// card itself and never knows there was a wrapper.

import { useRef, useState } from "react";

export function TheParcel({ to, children }: { to: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pull, setPull] = useState(0);
  const from = useRef<number | null>(null);

  // How far the string has been drawn, 0 to 1.
  const drawn = open ? 1 : pull;

  function begin(y: number) {
    if (open) return;
    from.current = y;
  }

  function drag(y: number) {
    if (open || from.current === null) return;
    const far = Math.max(0, Math.min(1, (y - from.current) / 130));
    setPull(far);
    if (far >= 1) {
      from.current = null;
      setOpen(true);
    }
  }

  function letGo() {
    from.current = null;
    if (!open) setPull(0);
  }

  return (
    <div className="parcel" data-open={open ? "yes" : "no"}>
      <div className="parcel-card">{children}</div>

      <div
        className="parcel-paper"
        aria-hidden={open ? "true" : undefined}
        style={{ "--pulled": drawn } as React.CSSProperties}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          begin(e.clientY);
        }}
        onPointerMove={(e) => drag(e.clientY)}
        onPointerUp={letGo}
        onPointerCancel={letGo}
      >
        <div className="parcel-for">For {to}</div>

        <button
          type="button"
          className="parcel-string"
          aria-label="Pull the string to open the card"
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <svg viewBox="0 0 40 130" aria-hidden focusable="false">
            <path
              d="M20 0 C 20 40, 14 60, 20 96"
              fill="none"
              stroke="#a9803f"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="20" cy="104" r="9" fill="#c9a06a" />
            <circle cx="20" cy="104" r="4" fill="#8a5f2e" />
          </svg>
          <span className="parcel-say">Pull</span>
        </button>
      </div>
    </div>
  );
}
