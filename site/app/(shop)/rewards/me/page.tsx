import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { CrossWheat } from "@/components/Sprite";
import { SignOutButton } from "@/components/rewards/SignOutButton";
import { money } from "@/lib/content";
import { bagsEarned, pointsToNext, progress, standing } from "@/lib/rewards";
import { accountFor } from "@/lib/rewards-source";
import { signedInEmail } from "@/lib/rewards-auth";
import { getShop } from "@/lib/settings";

export const metadata: Metadata = { title: "Your points", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyRewardsPage() {
  const email = await signedInEmail();
  if (!email) redirect("/rewards");

  const [shop, account] = await Promise.all([getShop(), accountFor(email)]);
  const { rewardAt } = shop.rewards;
  const points = account?.points ?? 0;
  const owed = bagsEarned(points, shop.rewards);
  const filled = Math.round(progress(points, shop.rewards) * 100);

  return (
    <>
      <PageHeader
        eyebrow={account?.name ? `Hello ${account.name.split(" ")[0]}` : "Your account"}
        title={`${points} points.`}
        standfirst={standing(points, shop.rewards)}
      />

      <section className="mx-auto mt-12 w-full max-w-[620px] px-6 sm:px-10">
        <div className="flex flex-col gap-3 border border-rule bg-paper px-7 py-7">
          <div className="flex items-baseline justify-between font-ui text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
            <span>Toward the next free bag</span>
            <span className="tabular-nums">
              {rewardAt > 0 ? Math.max(0, points) % rewardAt : 0} / {rewardAt}
            </span>
          </div>
          <div className="h-3 w-full bg-cream" role="img" aria-label={`${filled}% of the way`}>
            <div className="h-full bg-sage" style={{ width: `${filled}%` }} />
          </div>
          <p className="font-ui text-[13px] leading-relaxed text-muted">
            {pointsToNext(points, shop.rewards)} more points, which is about{" "}
            {money(Math.ceil(pointsToNext(points, shop.rewards) / Math.max(1, shop.rewards.pointsPerDollar)))} of
            granola
            {shop.jarRules.bonusPoints > 0
              ? `, or ${Math.ceil(pointsToNext(points, shop.rewards) / shop.jarRules.bonusPoints)} jars handed back`
              : ""}
            .
          </p>
        </div>

        {owed > 0 ? (
          <div className="mt-5 flex flex-col items-center gap-2 border border-moss-line bg-moss px-7 py-7 text-center">
            <CrossWheat size={28} color="#4f5a35" />
            <p className="display text-[27px] italic leading-tight">
              {owed} free bag{owed === 1 ? "" : "s"} waiting for you.
            </p>
            <p className="max-w-sm text-[17px] leading-relaxed text-sage-deep">
              She will add {owed === 1 ? "it" : "them"} to your next delivery. Nothing for you to do, and
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pb-16">
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
