"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { emailWinner, resetWinner } from "@/app/owner/giveaway-actions";
import { idle } from "@/lib/save-state";
import type { Entry } from "@/lib/giveaway-store";

/** Who the wheel picked, with the details she needs to reach them. */
export function GiveawayWinner({ winner }: { winner: Entry }) {
  const [mailState, mail] = useActionState(() => emailWinner(), idle);
  const [resetState, reset] = useActionState(() => resetWinner(), idle);
  const note = mailState.message || resetState.message;
  const failed = !mailState.ok || !resetState.ok;

  return (
    <section className="owner-panel flex flex-col gap-3">
      <div className="small-caps">This month&apos;s winner</div>
      <p className="display m-0 text-[30px] italic leading-tight">{winner.name}</p>
      <p className="font-ui text-[14px] text-muted">
        @{winner.instagram} · {winner.email}
        {winner.phone ? ` · ${winner.phone}` : " · no phone given"}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <form action={mail}>
          <Submit className="stamp !px-4 !py-2 !text-[11px]">Email the winner</Submit>
        </form>
        <form action={reset}>
          <Submit className="font-ui text-[12px] text-brown underline underline-offset-4">Clear winner</Submit>
        </form>
      </div>
      <p role="status" aria-live="polite" className={`font-ui text-[12px] font-semibold ${failed ? "text-brown" : "text-sage-deep"}`}>
        {note}
      </p>
    </section>
  );
}

function Submit({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "…" : children}
    </button>
  );
}
