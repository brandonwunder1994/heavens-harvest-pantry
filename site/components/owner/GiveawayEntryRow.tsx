"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteEntry, verifyEntry } from "@/app/owner/giveaway-actions";
import { idle } from "@/lib/save-state";
import type { Entry } from "@/lib/giveaway-store";

/** One entrant. She opens their Instagram, checks the like and share, then taps Verify. */
export function GiveawayEntryRow({ entry }: { entry: Entry }) {
  const [verifyState, verify] = useActionState(verifyEntry, idle);
  const [removeState, remove] = useActionState(deleteEntry, idle);
  const [asking, setAsking] = useState(false);
  const note = !removeState.ok ? removeState.message : verifyState.message;
  const failed = !removeState.ok || !verifyState.ok;

  return (
    <article className={`flex flex-col gap-3 border px-5 py-4 ${entry.verified ? "border-rule bg-paper" : "border-brown bg-[#fdf6ea]"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-ui text-[14px] font-semibold">
          {entry.name}
          {entry.winner ? <span className="ml-2 font-normal text-sage-deep">· Winner</span> : null}
        </span>
        <a
          href={`https://www.instagram.com/${entry.instagram}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-ui text-[14px] font-semibold text-brown underline underline-offset-4"
        >
          @{entry.instagram}
        </a>
      </div>

      <p className="font-ui text-[13px] text-muted">
        {entry.email}
        {entry.phone ? ` · ${entry.phone}` : ""} · {shortDate(entry.createdAt)}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {entry.verified ? (
          <span className="font-ui text-[12px] font-semibold text-sage-deep">Verified · on the wheel</span>
        ) : (
          <form action={verify}>
            <input type="hidden" name="id" value={entry.id} />
            <Submit className="stamp !px-4 !py-2 !text-[11px]">Verified, send confirmation</Submit>
          </form>
        )}

        {asking ? (
          <form action={remove} className="ml-auto flex items-center gap-3">
            <input type="hidden" name="id" value={entry.id} />
            <span className="font-ui text-[12px] font-semibold text-brown">Delete {entry.name}&apos;s entry for good?</span>
            <Submit className="font-ui text-[12px] font-semibold text-brown underline underline-offset-4">Yes, delete</Submit>
            <button type="button" onClick={() => setAsking(false)} className="font-ui text-[12px] underline underline-offset-4">
              Keep it
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setAsking(true)} className="ml-auto font-ui text-[12px] text-brown underline underline-offset-4">
            Delete for good
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className={`font-ui text-[12px] font-semibold ${failed ? "text-brown" : "text-sage-deep"}`}>
        {note}
      </p>
    </article>
  );
}

function shortDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Phoenix" });
}

function Submit({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "…" : children}
    </button>
  );
}
