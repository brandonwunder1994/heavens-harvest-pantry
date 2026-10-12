"use client";

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useId, type ReactElement } from "react";
import { useFormStatus } from "react-dom";
import type { SaveState } from "@/lib/save-state";
import { ownerInputClass } from "@/lib/owner-ui";

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
    const navigation = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (!window.confirm("You have unsaved changes. Leave this page and discard them?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigation, true); };
  }, [dirty]);

  useEffect(() => {
    if (state.ok && state.message) onSaved?.();
  }, [state, onSaved]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule py-4">
      <button type="submit" disabled={pending} className="stamp disabled:opacity-60">
        {pending ? "Savingâ€¦" : label}
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

const FieldId = createContext<string | undefined>(undefined);

export function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-ui text-[12px] font-semibold text-muted">{label}</label>
      <FieldId.Provider value={id}>{Children.map(children, child => isValidElement(child) && typeof child.type === "string" && ["input", "textarea", "select"].includes(child.type) ? cloneElement(child as ReactElement<{id: string; "aria-describedby"?: string}>, { id, "aria-describedby": hint ? `${id}-hint` : undefined }) : child)}</FieldId.Provider>
      {hint ? <span id={`${id}-hint`} className="font-ui text-[12px] leading-relaxed text-muted">{hint}</span> : null}
    </div>
  );
}

export const inputClass = ownerInputClass;

/**
 * A price box. Holds what she typed as text, so she can clear it and retype
 * without it snapping to zero, and allows cents â€” a step of half a dollar made
 * the browser silently refuse to submit a price of $9.75.
 */
export function PriceInput({
  value,
  onChange,
}: {
  value: number | string;
  onChange: (value: string) => void;
}) {
  const id = useContext(FieldId);
  return (
    <div className="flex items-stretch">
      <span aria-hidden="true" className="flex items-center border border-r-0 border-sand bg-cream px-2.5 font-ui text-[15px] text-muted">
        $
      </span>
      <input
        id={id}
        className={inputClass}
        type="number"
        min={0.01}
        required
        max={999}
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
