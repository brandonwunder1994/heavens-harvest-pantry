import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { ReviewRow } from "@/components/owner/ReviewRow";
import { isSignedIn } from "@/lib/owner-auth";
import { allReviews } from "@/lib/reviews-source";
import { averageRating } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export default async function OwnerReviewsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const result = await allReviews();
  const reviews = result.status === "ok" ? result.reviews : [];
  const waiting = reviews.filter((review) => !review.approved);
  const live = reviews.filter((review) => review.approved);

  return (
    <OwnerShell active="/owner/reviews">
      <OwnerHeading
        eyebrow="Reviews"
        title={
          result.status !== "ok"
            ? "Cannot read your reviews just now."
            : waiting.length > 0
              ? `${waiting.length} waiting on you.`
              : live.length > 0
                ? `${live.length} on the site, averaging ${averageRating(live)}.`
                : "No reviews yet."
        }
        note="Nothing appears on the site until you put it there. You can delete anything, at any time, and nobody is told."
      />

      {result.status === "error" ? <CannotReach what="reviews" /> : null}
      {result.status === "not_configured" ? (
        <p
          role="status"
          className="dashed-frame bg-paper px-5 py-4 font-ui text-[14px] leading-relaxed text-bark"
        >
          Reviews are not switched on yet. Nothing has been lost; there is simply nowhere to keep them
          until the site is finished being set up.
        </p>
      ) : null}

      {result.status === "ok" && reviews.length === 0 ? (
        <p className="dashed-frame bg-paper px-5 py-8 text-center font-ui text-[14px] text-muted">
          When someone leaves a review it lands here first. There is a form at the bottom of the reviews
          page, and a link to it goes out with the thank-you after every order.
        </p>
      ) : null}

      {waiting.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="display m-0 text-[24px]">Waiting on you</h2>
          {waiting.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </section>
      ) : null}

      {live.length > 0 ? (
        <section className="mt-4 flex flex-col gap-4">
          <h2 className="display m-0 text-[24px]">On the site</h2>
          {live.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </section>
      ) : null}
    </OwnerShell>
  );
}
