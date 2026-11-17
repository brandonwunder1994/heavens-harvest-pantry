import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { starLine } from "@/lib/reviews";
import { publishedReviews } from "@/lib/reviews-source";
import { getShop } from "@/lib/settings";
import { josephReview } from "@/lib/customer-testimonial";

export const metadata: Metadata = {
  alternates: { canonical: "/reviews" },
  title: "Reviews",
  description: "What customers say after an order.",
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

  // Joseph's review sits on the page by hand, so it is counted by hand too.
  const ratings = [josephReview.rating, ...reviews.map((review) => review.rating)];
  const average = Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;

  return (
    <>
      <PageHeader
        eyebrow="Customer reviews"
        title="What customers say at the door."
        standfirst="Words from customers who tried our snacks."
      />

      {ratings.length > 0 ? (
        <section className="mx-auto mt-10 flex w-full max-w-[820px] flex-col items-center gap-1 px-6 sm:px-10">
          <div className="text-[24px] tracking-[0.2em] text-gold" aria-hidden>
            {starLine(average)}
          </div>
          <p className="font-ui text-[13px] text-muted">
            {average} out of 5, from {ratings.length} {ratings.length === 1 ? "customer" : "customers"}
          </p>
        </section>
      ) : null}

      <section className="mx-auto mt-10 w-full max-w-[820px] px-6 sm:px-10">
        <div className="flex flex-col gap-6">
          <article className="dashed-frame flex flex-col gap-3 bg-paper px-6 py-7 sm:px-8">
            <div className="text-[15px] tracking-[0.18em] text-gold">
              <span aria-hidden>{starLine(josephReview.rating)}</span>
              <span className="sr-only">{josephReview.rating} out of 5</span>
            </div>
            <p className="text-[20px] italic leading-snug text-ink sm:text-[24px]">&ldquo;{josephReview.body}&rdquo;</p>
            <div className="small-caps">{josephReview.name}</div>
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
                  {review.flavor ? ` · ${review.flavor}` : ""}
                </div>
              </article>
            ))}
        </div>
      </section>

      <section id="leave-one" className="mx-auto mt-14 w-full max-w-[820px] px-6 pb-16 sm:px-10">
        <h2 className="display mb-4 text-center text-[32px] sm:text-[40px]">Tried our snacks?</h2>
        <ReviewForm flavors={shop.flavors.map((f) => f.name)} presetFlavor={flavor} />
      </section>
    </>
  );
}
