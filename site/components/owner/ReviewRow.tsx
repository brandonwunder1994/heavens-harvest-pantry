"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { approveReview, deleteReview } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import { starLine, type Review } from "@/lib/reviews";

/**
 * One review waiting on her. Publishing puts it on the reviews page; deleting
 * takes it away for good, so the button says so.
 */
export function ReviewRow({ review }: { review: Review }) {
  const [publishState, publish] = useActionState(approveReview, idle);
  const [removeState, remove] = useActionState(deleteReview, idle);
  const [asking, setAsking] = useState(false);
  const trouble = !removeState.ok ? removeState.message : !publishState.ok ? publishState.message : "";

  return (
    <article
      className={`flex flex-col gap-3 border px-5 py-4 ${
        review.approved ? "border-rule bg-paper" : "border-brown bg-[#fdf6ea]"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-ui text-[14px] font-semibold">
          {review.name}
          {review.flavor ? <span className="font-normal text-muted"> · {review.flavor}</span> : null}
        </span>
        <span className="font-ui text-[13px] tracking-[0.15em] text-brown">
          <span aria-hidden>{starLine(review.rating)}</span>
          <span className="sr-only">{review.rating} out of 5</span>
        </span>
      </div>

      <p className="text-[17px] italic leading-snug text-ink">{review.body}</p>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-ui text-[12px] text-muted">{shortDate(review.createdAt)}</span>

        {review.approved ? (
          <span className="font-ui text-[12px] font-semibold text-sage-deep">On the site</span>
        ) : (
          <form action={publish}>
            <input type="hidden" name="id" value={review.id} />
            <Submit className="stamp !px-4 !py-2 !text-[11px]">Put it on the site</Submit>
          </form>
        )}

        {/* Two taps, because a delete cannot be undone and this button sits
            next to the one that publishes. */}
        {asking ? (
          <form action={remove} className="ml-auto flex items-center gap-3">
            <input type="hidden" name="id" value={review.id} />
            <span className="font-ui text-[12px] font-semibold text-brown">
              Delete {review.name}&apos;s review for good?
            </span>
            <Submit className="font-ui text-[12px] font-semibold text-brown underline underline-offset-4">
              Yes, delete
            </Submit>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="font-ui text-[12px] underline underline-offset-4"
            >
              Keep it
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="ml-auto font-ui text-[12px] text-brown underline underline-offset-4"
          >
            Delete for good
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className="font-ui text-[12px] font-semibold text-brown">
        {trouble}
      </p>
    </article>
  );
}

/**
 * Her clock, not the server's. Without a fixed zone this renders one date on
 * the server and another in the browser, and the text jumps after the page
 * settles.
 */
function shortDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Phoenix",
  });
}

function Submit({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "…" : children}
    </button>
  );
}
