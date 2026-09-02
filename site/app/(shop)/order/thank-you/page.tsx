import type { Metadata } from "next";
import Link from "next/link";
import { CrossWheat, HeartSeal } from "@/components/Sprite";
import { ClearCartOnMount } from "@/components/checkout/ClearCartOnMount";
import { formatMoney } from "@/lib/cart";
import { business, filled } from "@/lib/content";
import { getShop } from "@/lib/settings";
import { accountFor } from "@/lib/rewards-source";
import { bagsEarned, pointsToNext } from "@/lib/rewards";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const shop = await getShop();
  const { verseOfTheWeek } = shop;
  const stripe = getStripe();

  let paid = false;
  let amountCents: number | null = null;
  let name = "";
  let runArea = "";
  let runDate = "";
  let jars = 0;
  let points = 0;
  let email = "";

  if (stripe && sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid";
      amountCents = session.amount_total;
      const meta = session.metadata ?? {};
      name = (meta.customer_name ?? "").split(" ")[0] ?? "";
      runArea = meta.run_area ?? "";
      runDate = meta.run_date ?? "";
      jars = Number(meta.jars_returned ?? 0);
      points = Number(meta.points_earned ?? 0);
      email = session.customer_details?.email ?? "";
    } catch {
      // A stale or forged session id just falls through to the generic message.
    }
  }

  // The webhook is what actually records the points, and it can land a moment
  // after this page does, so the balance is only shown once it is really there.
  const account = paid && email ? await accountFor(email) : null;
  const balance = account?.points ?? 0;
  const owed = bagsEarned(balance, shop.rewards);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 px-6 pb-20 pt-4 text-center sm:px-10">
      {paid ? <ClearCartOnMount /> : null}
      <HeartSeal size={48} />

      <h1 className="display m-0 text-[44px] sm:text-[58px]">
        {paid ? (name ? `Thank you, ${name}.` : "Thank you.") : "Thank you."}
      </h1>

      {paid ? (
        <>
          <p className="max-w-md text-[20px] leading-relaxed text-bark">
            Your order is on the list.
            {runArea && runDate ? ` She bakes Monday and it lands on your porch in ${runArea} on ${runDate}.` : ""}{" "}
            You&apos;ll get a text when she sets out.
          </p>

          <dl className="dashed-frame grid w-full max-w-[420px] grid-cols-2 gap-x-6 gap-y-2 bg-paper px-6 py-5 text-left font-ui text-[14px]">
            {amountCents !== null ? (
              <>
                <dt className="text-muted">Paid</dt>
                <dd className="m-0 text-right font-semibold text-ink">{formatMoney(amountCents)}</dd>
              </>
            ) : null}
            {jars > 0 ? (
              <>
                <dt className="text-muted">Jars to leave out</dt>
                <dd className="m-0 text-right font-semibold text-ink">{jars}</dd>
              </>
            ) : null}
            {points > 0 ? (
              <>
                <dt className="text-muted">Points earned</dt>
                <dd className="m-0 text-right font-semibold text-sage">+{points}</dd>
              </>
            ) : null}
            {balance > 0 ? (
              <>
                <dt className="text-muted">Your total</dt>
                <dd className="m-0 text-right font-semibold text-ink">{balance}</dd>
              </>
            ) : null}
          </dl>

          {balance > 0 ? (
            <p className="max-w-md font-ui text-[14px] leading-relaxed text-muted">
              {owed > 0
                ? `That is ${owed} free bag${owed === 1 ? "" : "s"} earned. She will add ${owed === 1 ? "it" : "them"} to your next delivery.`
                : `${pointsToNext(balance, shop.rewards)} points to your first free bag.`}{" "}
              <Link href="/rewards" className="font-semibold text-sage underline underline-offset-4">
                Check your points any time
              </Link>
              .
            </p>
          ) : null}
        </>
      ) : (
        <p className="max-w-md text-[20px] leading-relaxed text-bark">
          If your payment went through you will have a receipt by email, and she has your order. If you are not
          sure, {filled(business.phone) ? `text ${filled(business.phone)}` : "get in touch"} and she will check.
        </p>
      )}

      <div className="mt-2 flex flex-col items-center gap-3 border-t border-dashed border-hedge pt-8">
        <CrossWheat size={44} />
        <p className="verse max-w-lg text-[26px] text-ink sm:text-[30px]">
          &ldquo;{verseOfTheWeek.text}&rdquo;
        </p>
        <div className="ref text-sage">{verseOfTheWeek.reference}</div>
        <p className="mt-1 font-ui text-[13px] text-faint">This week&apos;s card, tucked in with your order.</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="stamp stamp-light">
          Back to the front page
        </Link>
        {paid ? (
          <Link href="/reviews#leave-one" className="stamp stamp-light">
            Tell her how it was
          </Link>
        ) : null}
      </div>
    </div>
  );
}
