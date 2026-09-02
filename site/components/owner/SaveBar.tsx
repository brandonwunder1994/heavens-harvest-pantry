"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import type { SaveState } from "@/lib/save-state";

/**
 * The one save button every editor uses, with an honest state: it says saving
 * while it is saving, and it never says saved unless the server said so.
 */
export function SaveBar({
  state,
  label = "Save changes",
  dirty = false,
  onSaved,
}: {
  state: SaveState;
  label?: string;
  /** True while there are edits on screen that are not in the database yet. */
  dirty?: boolean;
  onSaved?: () => void;
}) {
  const { pending } = useFormStatus();

  // Tell her before she loses work. The browser only allows this while
  // something on the page has actually been typed into.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (state.ok && state.message) onSaved?.();
  }, [state, onSaved]);

  return (
    <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule bg-cream/95 px-1 py-4 backdrop-blur">
      <button type="submit" disabled={pending} className="stamp disabled:opacity-60">
        {pending ? "Saving…" : label}
      </button>

      {dirty && !pending ? (
        <span className="font-ui text-[13px] font-semibold text-brown">Not saved yet</span>
      ) : null}

      {/*
        Always in the page, never mounted with its text: a live region that
        appears at the same moment as its content is not reliably read out.
      */}
      <p
        role="status"
        aria-live="polite"
        className={`font-ui text-[13px] ${state.ok ? "text-sage-deep" : "font-semibold text-brown"}`}
      >
        {state.message}
      </p>
    </div>
  );
}

export function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-ui text-[12px] font-semibold text-muted">{label}</span>
      {children}
      {hint ? <span className="font-ui text-[12px] leading-relaxed text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full border border-sand bg-paper px-3 py-2.5 font-ui text-[15px] text-ink placeholder:text-faint focus-visible:border-gold";

/**
 * A price box. Holds what she typed as text, so she can clear it and retype
 * without it snapping to zero, and allows cents — a step of half a dollar made
 * the browser silently refuse to submit a price of $9.75.
 */
export function PriceInput({
  value,
  onChange,
}: {
  value: number | string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-stretch">
      <span className="flex items-center border border-r-0 border-sand bg-cream px-2.5 font-ui text-[15px] text-muted">
        $
      </span>
      <input
        className={inputClass}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
