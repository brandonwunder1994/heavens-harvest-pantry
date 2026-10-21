import type { Metadata } from "next";
import Link from "@/components/ShopLink";
import { Confetti } from "@/components/giveaway/Confetti";
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
  const open = live && setting.open;

  return (
    <>
      <div className="relative">
        <Confetti />
        <div className="relative">
          <div className="ribbon-bob mx-auto mb-4 w-fit rounded-full border border-gold bg-paper px-5 py-2 font-ui text-[12px] font-bold uppercase tracking-[0.2em] text-brown shadow-sm">
            ★ Free granola every month ★
          </div>
          <PageHeader
            eyebrow="Monthly giveaway"
            title="Win a treat from our kitchen."
            standfirst={
              setting.prize && open
                ? `This month: ${setting.prize}.${draw ? ` Winner drawn ${draw}.` : ""}`
                : "Every month we give something away to say thank you to our neighbors."
            }
          />
        </div>
      </div>

      {!open ? (
        <p role="status" className="dashed-frame mx-auto mt-10 w-[calc(100%-3rem)] max-w-[1100px] bg-paper px-6 py-4 text-center font-ui text-[15px] leading-relaxed text-bark sm:w-[calc(100%-5rem)] sm:px-10">
          {live
            ? "The next giveaway isn't open yet. Follow us on Instagram so you catch it, and watch the wheel below fill up with names."
            : "The giveaway isn't available just now. Please check back in a little while."}
        </p>
      ) : null}

      <section className="mx-auto mt-12 grid w-full max-w-[1100px] gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div className="flex flex-col gap-6">
          <h2 className="display m-0 text-[28px]">How to enter</h2>
          <ol className="m-0 flex list-none flex-col gap-4 p-0 text-[19px] leading-snug text-bark">
            <Step n={1}>Open our giveaway post on Instagram.</Step>
            <Step n={2}>Like the post.</Step>
            <Step n={3}>Share it to your story or your feed.</Step>
            <Step n={4}>Come back here and fill in the form.</Step>
          </ol>
          {open && setting.postUrl ? (
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
        <GiveawayForm drawLabel={draw} closed={!open} />
      </section>

      <section className="mx-auto mt-20 flex w-full max-w-[1100px] flex-col items-center gap-6 px-6 sm:px-10">
        <div className="small-caps">The draw</div>
        <h2 className="display m-0 text-center text-[32px] sm:text-[44px]">
          {setting.revealed ? "Who's it going to be?" : draw ? `We spin it live ${draw}.` : "We spin it live on draw day."}
        </h2>
        <GiveawayWheel segments={segments} revealed={setting.revealed} isOwner={isOwner} winnerId={winner?.id ?? null} />
      </section>

      <section className="mx-auto mt-20 w-full max-w-[1100px] px-6 pb-20 sm:px-10">
        <div className="dashed-frame flex flex-col items-center gap-5 bg-paper px-6 py-10 text-center sm:px-10">
          <p className="display m-0 max-w-2xl text-[28px] leading-tight sm:text-[38px]">
            Want to Buy a Bag Outside of Our Raffle? Check Out the Menu!
          </p>
          <Link href="/menu" className="stamp">
            Check out the menu
          </Link>
        </div>
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
