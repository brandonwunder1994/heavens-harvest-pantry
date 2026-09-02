"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { handBackToCalendar } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import type { Verse } from "@/lib/content";

/**
 * What the calendar has chosen for this week, and — when she has overridden it —
 * the way back.
 *
 * The point of the calendar is that there is nothing to do on a Monday morning.
 * The point of this panel is that she can still take the wheel any week she
 * wants to, and give it back without having to remember how.
 */
export function CalendarVerse({ chosen, overridden }: { chosen: Verse; overridden: boolean }) {
  const [state, action] = useActionState(handBackToCalendar, idle);

  return (
    <section className="flex flex-col gap-3 border border-moss-line bg-moss px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display m-0 text-[21px]">The verse this week chose itself</h2>
        <span className="font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-sage-deep">
          {overridden ? "You have overridden it" : "In use"}
        </span>
      </div>

      <p className="verse text-[19px] text-ink">&ldquo;{chosen.text}&rdquo;</p>
      <div className="ref !text-[10px] text-sage-deep">{chosen.reference}</div>

      <p className="max-w-[62ch] font-ui text-[13px] leading-relaxed text-sage-deep">
        {overridden
          ? "The verse below is yours, and it is the one going out. Hand it back whenever you like and the calendar picks up where it would have been."
          : "A new one arrives every Monday at five in the morning, worked out from the date. There is nothing to switch and nothing to forget. Change it below any week you want something else."}
      </p>

      {overridden ? (
        <form action={action} className="flex flex-wrap items-center gap-4">
          <HandBack />
          <p role="status" aria-live="polite" className="font-ui text-[13px] text-sage-deep">
            {state.message}
          </p>
        </form>
      ) : null}
    </section>
  );
}

function HandBack() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="stamp stamp-cream w-fit disabled:opacity-60">
      {pending ? "Handing it back…" : "Use this week's verse instead"}
    </button>
  );
}
