import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { isSignedIn } from "@/lib/owner-auth";
import { everyStanding } from "@/lib/rewards-source";
import { bagsEarned, pointsToNext } from "@/lib/rewards";
import { readShop } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function OwnerRewardsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const [{ shop }, result] = await Promise.all([readShop(), everyStanding()]);
  const standings = result.status === "ok" ? result.standings : [];
  const owed = standings.filter((person) => bagsEarned(person.points, shop.rewards) > 0);

  return (
    <OwnerShell active="/owner/rewards">
      <OwnerHeading
        eyebrow="Rewards"
        title={
          result.status !== "ok"
            ? "Cannot read the points just now."
            : owed.length > 0
              ? `${owed.length} ${owed.length === 1 ? "person has" : "people have"} earned a free bag.`
              : standings.length > 0
                ? `${standings.length} ${standings.length === 1 ? "customer" : "customers"} punching a card.`
                : "No points yet."
        }
        note="Buy 10 bags or jars, get one free. Returned jars still help. Counts are from paid orders only, so nothing here can be gamed from the shop."
      />

      {result.status === "error" ? <CannotReach what="points" /> : null}

      {result.status === "not_configured" ? (
        <p
          role="status"
          className="dashed-frame bg-paper px-5 py-4 font-ui text-[14px] leading-relaxed text-bark"
        >
          Points are not switched on yet. Nothing is being lost; they start counting as soon as the site
          is finished being set up.
        </p>
      ) : null}

      {result.status === "ok" && standings.length === 0 ? (
        <p className="dashed-frame bg-paper px-5 py-8 text-center font-ui text-[14px] text-muted">
          Points start counting the first time a card payment goes through. Until then there is nothing
          to show here.
        </p>
      ) : null}

      {standings.length > 0 ? (
        <div className="border border-rule bg-paper">
          <div className="hidden grid-cols-[1.4fr_1.6fr_0.6fr_1.2fr] gap-3 px-5 py-3 font-ui text-[11px] font-semibold uppercase tracking-[0.18em] text-muted md:grid">
            <span>Name</span>
            <span>Email</span>
            <span className="text-right">Points</span>
            <span>Where they are</span>
          </div>
          {standings.map((person) => {
            const bags = bagsEarned(person.points, shop.rewards);
            return (
              <div
                key={person.email}
                className={`grid grid-cols-1 gap-1 border-t border-rule px-5 py-3.5 md:grid-cols-[1.4fr_1.6fr_0.6fr_1.2fr] md:items-center md:gap-3 ${
                  bags > 0 ? "bg-moss" : ""
                }`}
              >
                <span className="font-ui text-[14px] font-semibold">{person.name || "Customer"}</span>
                <span className="break-words font-ui text-[13px] text-muted">{person.email}</span>
                {/* On a phone the header row is hidden, so the number says what it is. */}
                <span className="font-ui text-[14px] tabular-nums md:text-right">
                  <span className="text-muted md:hidden">Points </span>
                  {person.points}
                </span>
                <span className="font-ui text-[13px]">
                  {bags > 0 ? (
                    <strong className="font-semibold text-sage-deep">
                      {bags} free bag{bags === 1 ? "" : "s"} owed
                    </strong>
                  ) : (
                    <span className="text-muted">
                      {pointsToNext(person.points, shop.rewards)} points to go
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="max-w-[62ch] font-ui text-[13px] leading-relaxed text-muted">
        A free bag is not taken off automatically. When someone is owed one, add it to their next
        delivery and tell them at the door. That keeps the reward a moment between the two of you rather
        than a line on a receipt.
      </p>
    </OwnerShell>
  );
}
