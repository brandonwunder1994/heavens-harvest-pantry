import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { HeartSeal } from "@/components/Sprite";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { averageRating, starLine } from "@/lib/reviews";
import { publishedReviews } from "@/lib/reviews-source";
import { getShop } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Reviews",
  description: "What neighbors say after a delivery. Every review is read and published by hand.",
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ flavor?: string }>;
}) {
  const [{ flavor }, shop, reviews] = await Promise.all([
    searchParams,
    getShop(),
    publishedReviews(),
  ]);

  const average = averageRating(reviews);

  return (
    <>
      <PageHeader
        eyebrow="From the neighborhood"
        title="What people say at the door."
        standfirst="She reads every one of these herself before it goes up, and nothing is edited except to take out an address or a phone number."
      />

      {reviews.length > 0 ? (
        <section className="mx-auto mt-10 flex w-full max-w-[820px] flex-col items-center gap-1 px-6 sm:px-10">
          <div className="text-[24px] tracking-[0.2em] text-gold" aria-hidden>
            {starLine(average)}
          </div>
          <p className="font-ui text-[13px] text-muted">
            {average} out of 5, from {reviews.length} {reviews.length === 1 ? "neighbor" : "neighbors"}
          </p>
        </section>
      ) : null}

      <section className="mx-auto mt-10 w-full max-w-[820px] px-6 sm:px-10">
        {reviews.length === 0 ? (
          <div className="dashed-frame flex flex-col items-center gap-4 bg-paper px-8 py-14 text-center">
            <HeartSeal size={44} />
            <p className="display text-[30px] italic leading-tight text-ink sm:text-[38px]">
              No reviews yet. Be the first.
            </p>
            <p className="max-w-md text-[18px] leading-relaxed text-muted">
              If a bag has already landed on your porch, the form below goes straight to her.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {reviews.map((review) => (
              <article key={review.id} className="dashed-frame flex flex-col gap-2.5 bg-paper px-6 py-6 sm:px-8">
                <div className="text-[15px] tracking-[0.18em] text-gold">
                  <span aria-hidden>{starLine(review.rating)}</span>
                  <span className="sr-only">{review.rating} out of 5</span>
                </div>
                <p className="text-[20px] italic leading-snug text-ink sm:text-[22px]">{review.body}</p>
                <div className="small-caps">
                  {review.name}
                  {review.flavor ? ` · ${review.flavor}` : ""} · a neighbor
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="leave-one" className="mx-auto mt-14 w-full max-w-[820px] px-6 pb-16 sm:px-10">
        <h2 className="display mb-4 text-center text-[32px] sm:text-[40px]">Had a delivery?</h2>
        <ReviewForm flavors={shop.flavors.map((f) => f.name)} presetFlavor={flavor} />
      </section>
    </>
  );
}
