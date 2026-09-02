import Link from "next/link";
import Image from "next/image";
import { CrossWheat, HeartSeal, Jar } from "@/components/Sprite";
import { HeroShelf, jarLabel } from "@/components/HeroShelf";
import ThePour from "@/components/hero/ThePour";
import { ScriptureBand } from "@/components/ScriptureBand";
import { MenuList } from "@/components/MenuList";
import { business, filled, money, type Shop } from "@/lib/content";
import { getShop } from "@/lib/settings";
import { publishedReviews } from "@/lib/reviews-source";
import { blessingBagsThisYear } from "@/lib/orders-source";

const stepsFor = (shop: Shop) => [
  {
    numeral: "I",
    title: "Order by Sunday night.",
    body: "Three taps from your phone. No account, no app.",
  },
  {
    numeral: "II",
    title: "She bakes Monday.",
    body: "Only what was ordered, and she prays over each name on the list.",
  },
  {
    numeral: "III",
    title: "On your porch, with a text.",
    body: `${shop.delivery.runs
      .map((run) => `${run.day} in ${run.area}`)
      .join(", ")}, or a drop-off spot.`,
  },
];

export default async function HomePage() {
  const [shop, reviews, blessed] = await Promise.all([
    getShop(),
    publishedReviews(1),
    blessingBagsThisYear(),
  ]);
  const { blessingBag, delivery, jarRules, rewards, verses } = shop;
  const steps = stepsFor(shop);
  // The front page quotes whatever she has most recently put on the site, so it
  // is never a bracketed placeholder once a real one exists.
  const lead = reviews[0];

  return (
    <>
      {/* Granola falls into a real jar, settles, and then the words arrive.
          The jar sits to the right and the words to its left, so nothing is
          read through the glass. Anyone on an old phone, a metered connection,
          or with motion switched off gets a photograph of the same scene and is
          never told they missed anything — see components/hero/still.js. */}
      <ThePour className="min-h-[84vh] w-full lg:min-h-[78vh]">
        <div className="mx-auto flex min-h-[84vh] w-full max-w-[1296px] items-end px-6 pb-10 sm:px-10 lg:min-h-[78vh] lg:items-center lg:px-18 lg:pb-0">
          <div className="flex max-w-[600px] flex-col items-start gap-5 text-left">
            <h1 className="display m-0 text-[40px] leading-[0.98] text-ink sm:text-[52px] lg:text-[66px]">
              Granola baked
              <br />
              <em className="italic text-sage">this week,</em>
              <br />a few streets away.
            </h1>
            <p className="max-w-[460px] text-[18px] leading-relaxed text-bark sm:text-[20px]">
              Oats, honey, nuts and not much else. Made in small batches in a {business.kitchen} kitchen,
              prayed over, and left on your porch in a bag or a mason jar you can bring back.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-4">
              <Link href="/menu" className="stamp">
                See this week&apos;s flavors
              </Link>
              <Link href="/delivery" className="stamp stamp-light">
                How delivery works
              </Link>
            </div>
          </div>
        </div>
      </ThePour>

      <div className="mx-auto mt-5 w-full max-w-[1296px] px-6 sm:px-10 lg:px-18">
        <HeroShelf labels={shop.flavors.slice(0, 3).map((f) => f.name)} />
      </div>

      <div className="mt-10">
        <ScriptureBand verse={verses.hero}>
          That verse is why this kitchen exists. Good food, made slowly, handed to a neighbor is one of the plainest
          ways we know to show someone they are loved.
        </ScriptureBand>
      </div>

      <section className="grid gap-12 px-6 pt-16 sm:px-10 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-20 lg:px-18 lg:pt-[84px]">
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-4">
            <HeartSeal />
            <h2 className="display m-0 text-[38px] sm:text-[58px]">This week&apos;s menu</h2>
          </div>
          <MenuList shop={shop} />
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Link href="/menu" className="stamp">
              Start an order
            </Link>
            <span className="font-ui text-[14px] text-muted">
              Ingredients and allergens on every flavor. {delivery.cutoff}.
            </span>
          </div>
        </div>

        <aside className="dashed-frame flex flex-col gap-4 bg-paper px-7 pb-6 pt-7">
          <div className="small-caps">Jar or bag?</div>
          <svg viewBox="0 0 160 220" className="mx-auto h-auto w-[120px]" aria-hidden focusable="false">
            <Jar x={0} y={0} label={["Any", "flavor"]} />
          </svg>
          <p className="text-[18px] leading-snug text-bark">
            The <strong className="font-semibold">bag</strong> is a resealable pouch, {jarRules.bagSize}.
          </p>
          <p className="text-[18px] leading-snug text-bark">
            The <strong className="font-semibold">jar</strong> is a {jarRules.jarSize}. It costs $3 more, stays fresh
            longer, and every time you hand one back you take {money(jarRules.creditDollars)} off.
          </p>
          <p className="text-[15px] italic text-sage">Most regulars end up on jars.</p>
        </aside>
      </section>

      <section className="mx-6 mt-16 grid border-y border-sand sm:mx-10 lg:mx-18 lg:mt-[84px] lg:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.numeral}
            className={`flex items-start gap-5 py-8 lg:px-8 ${
              i === 0 ? "lg:pl-0" : ""
            } ${i === 2 ? "lg:pr-0" : "border-b border-sand lg:border-b-0 lg:border-r"}`}
          >
            <span className="caps text-[30px] leading-none text-gold">{step.numeral}</span>
            <div className="flex flex-col gap-1.5">
              <div className="display text-[25px] sm:text-[27px]">{step.title}</div>
              <p className="text-[17px] leading-snug text-muted">{step.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-10 px-6 pt-20 sm:px-10 lg:grid-cols-[420px_1fr] lg:items-start lg:gap-[72px] lg:px-18 lg:pt-[88px]">
        <div className="flex flex-col gap-3.5">
          <div className="dashed-frame flex h-[380px] items-center justify-center bg-paper p-2.5 lg:h-[500px]">
            <p className="px-8 text-center text-[19px] italic text-muted">
              A photograph of her kitchen belongs here.
            </p>
          </div>
          {filled(business.ownerName) ? (
            <p className="small-caps text-muted">{filled(business.ownerName)} · founder, baker, jar washer</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div className="small-caps">Why this kitchen exists</div>
          <h2 className="display m-0 text-[40px] sm:text-[56px]">
            A pantry is a small
            <br />
            way to love people.
          </h2>
          <div className="max-w-[620px] text-[19px] leading-relaxed text-bark sm:text-[21px]">
            <p className="dropcap mb-4">
              It started the way these things usually do. A neighbor was having a hard week, so she baked a batch and
              walked it over. Then someone else asked for a jar, and then their sister did, and the oven has not really
              cooled since.
            </p>
            <p>
              Everything that leaves this kitchen is made the same way it would be for family: honest ingredients,
              nothing hurried, and a prayer over the list before the first tray goes in.
            </p>
          </div>
          <div className="flex max-w-[620px] flex-col gap-2 border-l-[3px] border-gold py-1.5 pl-6">
            <p className="verse text-[26px] text-ink sm:text-[32px]">&ldquo;{verses.work.text}&rdquo;</p>
            <div className="ref text-sage">{verses.work.reference}</div>
          </div>
        </div>
      </section>

      <section className="mx-6 mt-20 grid overflow-hidden bg-brown text-cream sm:mx-10 lg:mx-18 lg:mt-[88px] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-5 px-8 py-12 sm:px-12 lg:px-16 lg:py-[72px]">
          <div className="small-caps !text-gold">The jar promise</div>
          <h2 className="display m-0 text-[48px] text-cream sm:text-[64px] lg:text-[76px]">
            This jar is
            <br />
            worth {money(jarRules.creditDollars)}.
          </h2>
          <p className="max-w-[460px] text-[19px] leading-relaxed text-linen sm:text-[21px]">
            Every jar goes out with a tag. When you reorder, tell us how many you are handing back and each one comes
            off the total before you pay. She counts them at the door.
          </p>
          <p className="max-w-[460px] text-[17px] italic leading-relaxed text-gold sm:text-[18px]">
            We were given a good earth to look after. Washing a jar and using it again is a small piece of that.
          </p>
          <Link href="/menu" className="stamp stamp-gold w-fit">
            Start a jar order
          </Link>
        </div>

        <div className="relative min-h-[420px] lg:min-h-[500px]">
          <svg viewBox="0 0 560 500" className="absolute inset-0 h-full w-full" aria-hidden focusable="false">
            <path d="M244 0 v60 c 0 40 -30 60 -20 100" stroke="#c9a06a" strokeWidth="1.5" fill="none" />
            <Jar x={330} y={130} scale={1.4} label={jarLabel(shop.flavors[1]?.name ?? shop.flavors[0]?.name ?? "")} />
          </svg>
          <div className="absolute left-[18%] top-[32%] w-[168px] -rotate-6 bg-cream p-2 shadow-[0_18px_30px_rgba(0,0,0,0.25)]">
            <div className="dashed-frame flex h-[214px] flex-col items-center justify-between px-2 pb-2.5 pt-2">
              <div className="h-2.5 w-2.5 rounded-full border-[1.4px] border-brown" />
              <div className="flex flex-col items-center gap-0.5">
                <div className="caps text-[7px] text-sage">{business.shortName}</div>
                <div className="display text-center text-[26px] text-ink">
                  This jar is
                  <br />
                  worth {money(jarRules.creditDollars)}.
                </div>
                <div className="text-[11px] italic text-muted">Bring it back next order.</div>
              </div>
              <div className="bg-white p-[3px]">
                <Image src="/qr.svg" alt="" width={56} height={56} className="block h-14 w-14" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-10 px-6 pt-20 sm:px-10 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-[72px] lg:px-18 lg:pt-24">
        <div className="flex flex-col gap-5">
          <div className="small-caps">In every order</div>
          <h2 className="display m-0 text-[40px] sm:text-[56px]">
            A verse card, written
            <br />
            by hand, tucked in the bag.
          </h2>
          <p className="max-w-[560px] text-[19px] leading-relaxed text-bark sm:text-[21px]">
            Each week she picks a verse and writes it out on a small card that goes into every order. Some people keep
            them on the windowsill above the sink. The whole set is posted here too, so you can look back at the one
            from the week you needed it.
          </p>
          <Link href="/verses" className="font-ui text-[14px] font-semibold text-sage hover:text-brown">
            Read every verse she has sent out
          </Link>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute h-[250px] w-full max-w-[380px] rotate-[5deg] border border-moss-line bg-moss" />
          <div className="relative h-[250px] w-full max-w-[380px] -rotate-3 bg-paper p-2.5 shadow-[0_16px_30px_rgba(58,39,18,0.18)]">
            <div className="dashed-frame flex h-full flex-col items-center justify-center gap-3 p-5">
              <CrossWheat size={44} />
              <p className="verse text-center text-[24px] text-ink sm:text-[27px]">&ldquo;{verses.card.text}&rdquo;</p>
              <div className="ref text-sage">{verses.card.reference}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-6 mt-20 grid gap-10 bg-sage px-8 py-14 text-cream sm:mx-10 sm:px-12 lg:mx-18 lg:mt-24 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-18 lg:py-[68px]">
        <div className="flex flex-col gap-5">
          <div className="small-caps !text-moss">Blessing bags</div>
          <h2 className="display m-0 text-[44px] text-cream sm:text-[60px]">
            Add a bag for
            <br />
            someone else.
          </h2>
          <p className="max-w-[480px] text-[19px] leading-relaxed text-moss sm:text-[21px]">{blessingBag.blurb}</p>
          <p className="font-ui text-[14px] tracking-wide text-moss">
            Names can be suggested by anyone. Church partners can request a batch at once.
          </p>
          <Link href="/blessing-bags" className="stamp stamp-cream w-fit">
            Bless a neighbor
          </Link>
        </div>

        <div className="flex flex-col items-center gap-5 text-center">
          <CrossWheat size={70} color="#f4eee2" />
          <p className="verse max-w-[460px] text-[30px] text-cream sm:text-[40px]">&ldquo;{verses.giving.text}&rdquo;</p>
          <div className="ref text-moss">{verses.giving.reference}</div>
          {/* Counted from paid orders. Left out entirely rather than guessed. */}
          {blessed !== null && blessed > 0 ? (
            <div className="border-t border-cream/35 pt-4 font-ui text-[15px] text-moss">
              {blessed} blessing bag{blessed === 1 ? "" : "s"} delivered so far this year
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-12 px-6 pt-20 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-18 lg:pt-24">
        <div className="flex flex-col gap-4">
          <HeartSeal />
          <p className="display text-[32px] italic leading-tight text-ink sm:text-[44px]">
            &ldquo;{lead ? lead.body : "The first review will go here, in a neighbor's own words, once the first deliveries land."}&rdquo;
          </p>
          <svg width="220" height="14" viewBox="0 0 220 14" aria-hidden focusable="false">
            <path
              d="M2 8 C 40 3, 80 12, 120 6 S 190 4, 218 9"
              fill="none"
              stroke="#6b7a4a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <div className="small-caps">
            {lead ? `${lead.name}${lead.flavor ? ` · ${lead.flavor}` : ""} · a neighbor` : "Waiting on the first one"}
          </div>
          <Link href="/reviews" className="mt-2 font-ui text-[14px] font-semibold text-sage hover:text-brown">
            Read the rest, or leave yours
          </Link>
        </div>

        <div className="flex flex-col items-start gap-5">
          <div className="small-caps">Pantry Rewards</div>
          <h2 className="display m-0 text-[40px] sm:text-[54px]">
            {rewards.pointsPerDollar === 1 ? "A point a dollar." : `${rewards.pointsPerDollar} points a dollar.`}
            <br />A free bag at {rewards.rewardAt}.
          </h2>
          <RewardsCard />
          <p className="max-w-[420px] text-[18px] leading-snug text-bark">
            Your phone number is your card. Returned jars earn extra, and so does sending a neighbor our way.
          </p>
        </div>
      </section>

      <div className="mt-20 lg:mt-24">
        <ScriptureBand verse={verses.table} tone="cream" size="medium" />
      </div>
    </>
  );
}

function RewardsCard() {
  const filled = 9;
  return (
    <svg viewBox="0 0 420 210" className="h-auto w-full max-w-[420px]" aria-hidden focusable="false">
      <rect x="1" y="1" width="418" height="208" fill="#fbf8f1" stroke="#5b3d1e" strokeWidth="1.5" />
      <rect x="9" y="9" width="402" height="192" fill="none" stroke="#a9b18a" strokeWidth="1" strokeDasharray="3 3" />
      <text
        x="210"
        y="40"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="11"
        fontWeight="700"
        letterSpacing="3"
        fill="#5b3d1e"
      >
        PANTRY REWARDS
      </text>
      <text x="210" y="60" textAnchor="middle" fontFamily="var(--font-serif)" fontSize="14" fontStyle="italic" fill="#6b5a42">
        One more for a free bag
      </text>
      {Array.from({ length: 10 }, (_, i) => {
        const cx = 60 + (i % 5) * 75;
        const cy = i < 5 ? 105 : 160;
        const stamped = i < filled;
        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r="18"
              fill="none"
              stroke="#5b3d1e"
              strokeWidth={stamped ? 1 : 1.2}
              strokeDasharray={stamped ? undefined : "3 3"}
            />
            {stamped ? <use href="#heart" transform={`translate(${cx - 12} ${cy - 12})`} fill="#c9a06a" /> : null}
          </g>
        );
      })}
    </svg>
  );
}
