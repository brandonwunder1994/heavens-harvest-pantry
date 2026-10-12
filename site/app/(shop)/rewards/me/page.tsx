import { REWARDS_ENABLED } from "@/lib/features";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { CrossWheat } from "@/components/Sprite";
import { SignOutButton } from "@/components/rewards/SignOutButton";
import { rewardOffer } from "@/lib/content";
import { bagsEarned, bagsToNext, progress, punchesFilled, standing } from "@/lib/rewards";
import { RewardsCard } from "@/components/rewards/RewardsCard";
import { accountFor } from "@/lib/rewards-source";
import { ordersFor } from "@/lib/orders-source";
import { JarShelf, VerseWall, WelcomeBack } from "@/components/rewards/ReturnPieces";
import { reorderLink } from "@/lib/reorder";
import { verseForWeek, weekNumber } from "@/lib/verses";
import { signedInEmail } from "@/lib/rewards-auth";
import { getShop } from "@/lib/settings";

export const metadata: Metadata = { title: "Your card", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyRewardsPage() {
  if (!REWARDS_ENABLED) redirect("/menu");
  const email = await signedInEmail();
  if (!email) redirect("/rewards");

  const [shop, account, orders] = await Promise.all([
    getShop(),
    accountFor(email),
    ordersFor(email),
  ]);

  // The wall reads the shop's own rotation rather than a copy, so it can never
  // disagree with the verse page about which card a given week carried.
  const verseFor = (on: Date) => {
    const week = verseForWeek(weekNumber(on));
    return { text: week.text, reference: week.ref };
  };

  // Anything she has renamed or sold out since simply is not in the link.
  const reorderHref = (items: { qty: number; name: string; format: "jar" | "bag" | "sampler" }[]) =>
    reorderLink(items, shop.flavors) ?? "/menu";
  const points = account?.points ?? 0;
  const owed = bagsEarned(points, shop.rewards);
  const filled = Math.round(progress(points, shop.rewards) * 100);
  const punched = punchesFilled(points, shop.rewards);
  const togo = bagsToNext(points, shop.rewards);

  return (
    <>
      <PageHeader
        eyebrow={account?.name ? `Hello ${account.name.split(" ")[0]}` : "Your account"}
        title={owed > 0 ? "A free bag is waiting." : rewardOffer.sentence}
        standfirst={standing(points, shop.rewards)}
      />

      <section className="mx-auto mt-12 w-full max-w-[620px] px-6 sm:px-10">
        <div className="mb-8 flex justify-center">
          <RewardsCard
            punched={punched}
            line={
              punched >= 10
                ? "A free bag is waiting"
                : punched === 9
                  ? "One more for a free bag"
                  : "Ten punches, a free bag"
            }
          />
        </div>
        <div className="flex flex-col gap-3 border border-rule bg-paper px-7 py-7">
          <div className="flex items-baseline justify-between font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
            <span>Toward the next free bag</span>
            <span className="tabular-nums">
              {punched >= 10 ? 10 : punched} / 10
            </span>
          </div>
          <div className="h-3 w-full bg-cream" role="img" aria-label={`${filled}% of the way`}>
            <div className="h-full bg-sage" style={{ width: `${filled}%` }} />
          </div>
          <p className="font-ui text-[13px] leading-relaxed text-muted">
            {rewardOffer.sentence}
            {togo > 0 ? ` ${togo} more bag${togo === 1 ? "" : "s"} or jar${togo === 1 ? "" : "s"} punches the card.` : ""}
          </p>
        </div>

        {owed > 0 ? (
          <div className="mt-5 flex flex-col items-center gap-2 border border-moss-line bg-moss px-7 py-7 text-center">
            <CrossWheat size={28} color="#4f5a35" />
            <p className="display text-[27px] italic leading-tight">
              {owed} free bag{owed === 1 ? "" : "s"} waiting for you.
            </p>
            <p className="max-w-sm text-[17px] leading-relaxed text-sage-deep">
              She will add {owed === 1 ? "it" : "them"} to your next pickup order. Nothing for you to do, and
              nothing to remember at checkout.
            </p>
          </div>
        ) : null}

        {account && account.history.length > 0 ? (
          <div className="mt-5 border border-rule bg-paper">
            <h2 className="border-b border-rule px-5 py-3 font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
              How you got here
            </h2>
            {account.history.map((entry, i) => (
              <div key={i} className="flex items-baseline justify-between border-b border-rule px-5 py-3 last:border-b-0">
                <span className="font-ui text-[14px]">{entry.reason}</span>
                <span className="font-ui text-[13px] text-muted">
                  {shortDate(entry.createdAt)}
                </span>
                <span className="font-ui text-[14px] font-semibold tabular-nums">
                  {entry.delta > 0 ? "+" : ""}
                  {entry.delta}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-8">
          <WelcomeBack name={account?.name ?? ""} orders={orders} reorderHref={reorderHref} />
          <JarShelf orders={orders} />
          <VerseWall orders={orders} verseFor={verseFor} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pb-16">
          <span className="font-ui text-[13px] text-faint">{email}</span>
          <SignOutButton />
        </div>
      </section>
    </>
  );
}

/**
 * Her kitchen's clock, not the server's and not the reader's. Without a fixed
 * zone the server renders one date and the browser another, and React replaces
 * the text after the page settles.
 */
function shortDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Phoenix",
  });
}
