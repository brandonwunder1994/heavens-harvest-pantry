import type { Metadata } from "next";
import Link from "@/components/ShopLink";
import { GiveawayForm } from "@/components/giveaway/GiveawayForm";
import { GiveawayWheel, type WheelSegment } from "@/components/giveaway/GiveawayWheel";
import { PageHeader } from "@/components/PageHeader";
import { databaseReady } from "@/lib/db";
import { drawLabel, noGiveaway, roundKey, wheelName } from "@/lib/giveaway";
import { currentWinner, readGiveaway, verifiedEntries, type Entry } from "@/lib/giveaway-store";
import { isSignedIn } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/monthly-giveaway" },
  title: "Monthly giveaway",
  description: "Like and share our Instagram post for a chance to win a free treat from Heaven's Harvest Pantry every month.",
};

export default async function MonthlyGiveawayPage() {
  const { setting, live } = databaseReady ? await readGiveaway() : { setting: noGiveaway, live: false };
  const round = roundKey(setting);

  let entries: Entry[] = [];
  let winner: Entry | null = null;
  if (live) {
    try {
      [entries, winner] = await Promise.all([verifiedEntries(round), setting.revealed ? currentWinner(round) : Promise.resolve(null)]);
    } catch (error) {
      console.error("[giveaway] could not read the entries", error);
    }
  }

  // Until draw day the page is given placeholders, never real names.
  const segments: WheelSegment[] = setting.revealed
    ? entries.map((entry) => ({ id: entry.id, label: wheelName(entry.name) }))
    : entries.map((_, index) => ({ id: index + 1, label: `Entry ${index + 1}` }));

  const draw = drawLabel(setting);
  const isOwner = await isSignedIn();
  const showForm = live && setting.open;
  const showWheel = live && (entries.length > 0 || setting.revealed || isOwner);

  return (
    <>
      <PageHeader
        eyebrow="Monthly giveaway"
        title="Win a treat from our kitchen."
        standfirst={
          setting.prize && showForm
            ? `This month: ${setting.prize}.${draw ? ` Winner drawn ${draw}.` : ""}`
            : "Every month we give something away to say thank you to our neighbors."
        }
      />

      <section className="mx-auto mt-12 grid w-full max-w-[1100px] gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        {showForm ? (
          <>
            <div className="flex flex-col gap-6">
              <h2 className="display m-0 text-[28px]">How to enter</h2>
              <ol className="m-0 flex list-none flex-col gap-4 p-0 text-[19px] leading-snug text-bark">
                <Step n={1}>Open our giveaway post on Instagram.</Step>
                <Step n={2}>Like the post.</Step>
                <Step n={3}>Share it to your story or your feed.</Step>
                <Step n={4}>Come back here and fill in the form.</Step>
              </ol>
              {setting.postUrl ? (
                <a href={setting.postUrl} target="_blank" rel="noopener noreferrer" className="stamp w-fit">
                  Open the Instagram post
                </a>
              ) : null}
              <div className="dashed-frame flex flex-col gap-2 bg-paper p-5">
                <div className="small-caps">What happens next</div>
                <p className="text-[17px] leading-relaxed text-bark">
                  After you enter, you get an email right away. We then look for your like and share on Instagram. Once
                  we&apos;ve found them, you&apos;ll get a second email confirming you&apos;re in
                  {draw ? `, with the draw on ${draw}` : ""}. One entry per person each month.
                </p>
                {setting.pickupNote ? <p className="text-[17px] leading-relaxed text-bark">{setting.pickupNote}</p> : null}
              </div>
            </div>
            <GiveawayForm drawLabel={draw} />
          </>
        ) : (
          <div className="dashed-frame flex flex-col items-center gap-3 bg-paper px-8 py-10 text-center lg:col-span-2">
            <div className="small-caps">{live ? "Between giveaways" : "Not available right now"}</div>
            <p className="max-w-xl text-[19px] leading-relaxed text-bark">
              {live
                ? "There isn't a giveaway open this moment. Follow us on Instagram so you catch the next one, and look around the menu while you're here."
                : "The giveaway isn't available just now. Please check back in a little while."}
            </p>
            <Link href="/menu" className="stamp">
              See the menu
            </Link>
          </div>
        )}
      </section>

      {showWheel ? (
        <section className="mx-auto mt-20 flex w-full max-w-[1100px] flex-col items-center gap-6 px-6 sm:px-10">
          <div className="small-caps">The draw</div>
          <h2 className="display m-0 text-center text-[32px] sm:text-[44px]">
            {setting.revealed ? "Who's it going to be?" : draw ? `We spin it live ${draw}.` : "We spin it live on draw day."}
          </h2>
          <GiveawayWheel segments={segments} revealed={setting.revealed} isOwner={isOwner} winnerId={winner?.id ?? null} />
        </section>
      ) : null}

      <section className="mx-auto mt-20 grid w-full max-w-[1100px] gap-6 px-6 pb-20 sm:grid-cols-3 sm:px-10">
        <Teaser href="/menu" title="See the lineup" body="Fresh granola, baked in small batches in our home kitchen." />
        <Teaser href="/blessing-bags" title="Send a blessing bag" body="Put a bag of granola and a verse on a friend's porch." />
        <Teaser href="/story" title="Our story" body="Why a home kitchen in Peoria bakes for its neighbors." />
      </section>
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-4">
      <span aria-hidden="true" className="display flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brown text-[20px] text-brown">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Teaser({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="flex flex-col gap-2 border-t border-sage pt-5 hover:text-sage">
      <h3 className="display m-0 text-[24px]">{title}</h3>
      <p className="text-[17px] leading-snug text-bark">{body}</p>
    </Link>
  );
}
