import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { averageRating, starLine } from "@/lib/reviews";
import { publishedReviews } from "@/lib/reviews-source";
import { getShop } from "@/lib/settings";
import { josephReview } from "@/lib/customer-testimonial";

export const metadata: Metadata = {
  alternates: { canonical: "/reviews" },
  title: "Reviews",
  description: "What neighbors say after an order. Every review is read and published by hand.",
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
        standfirst="Words from neighbors who have tried the granola. New reviews are read before they appear here."
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
        <div className="flex flex-col gap-6">
          <article className="dashed-frame flex flex-col gap-3 bg-paper px-6 py-7 sm:px-8">
            <p className="text-[20px] italic leading-snug text-ink sm:text-[24px]">&ldquo;{josephReview.body}&rdquo;</p>
            <div className="small-caps">{josephReview.name} · a neighbor</div>
          </article>
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
      </section>

      <section id="leave-one" className="mx-auto mt-14 w-full max-w-[820px] px-6 pb-16 sm:px-10">
        <h2 className="display mb-4 text-center text-[32px] sm:text-[40px]">Tried the granola?</h2>
        <ReviewForm flavors={shop.flavors.map((f) => f.name)} presetFlavor={flavor} />
      </section>
    </>
  );
}
