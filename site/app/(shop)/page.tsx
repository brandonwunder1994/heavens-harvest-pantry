import type { Metadata } from "next";
import { REWARDS_ENABLED } from "@/lib/features";
import { Suspense } from "react";
import Link from "@/components/ShopLink";
import { CrossWheat, HeartSeal } from "@/components/Sprite";
import { HeroShelf } from "@/components/HeroShelf";
import { FloatingJar } from "@/components/FloatingJars";
import ThePour from "@/components/hero/ThePour";
import { KitchenPhoto } from "@/components/KitchenPhoto";
import { StoryNarrative } from "@/components/StoryNarrative";
import { MenuList } from "@/components/MenuList";
import { ScriptureBand } from "@/components/ScriptureBand";
import { RewardsCard } from "@/components/rewards/RewardsCard";
import { business, filled, money, rewardOffer, type Flavor, type Shop } from "@/lib/content";
import { getShop } from "@/lib/settings";
import { menuFlavors } from "@/lib/menu-groups";
import { ReadyNow } from "@/components/menu/ReadyNow";
import { josephReview } from "@/lib/customer-testimonial";
import { DELIVERY_ENABLED, PICKUP_LABEL, nextPickups } from "@/lib/fulfilment";
import { blessingBagsThisYear } from "@/lib/orders-source";

const stepsFor = () => [
  {
    numeral: "I",
    title: "Order by Tuesday at 9 p.m.",
    body: "Three taps from your phone. No account, no app.",
  },
  {
    numeral: "II",
    title: "Made fresh for Friday and Saturday.",
    body: "Only what was ordered, and she prays over each name on the list.",
  },
  {
    numeral: "III",
    title: PICKUP_LABEL,
    body: "Choose morning or afternoon. Pickup details arrive with your paid confirmation.",
  },
];

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  // The hero does not need Stripe or reviews. Those wait below, in their own
  // holes, so a slow order book cannot keep the headline off the screen.
  const shop = await getShop();
  const { blessingBag, jarRules, verses } = shop;
  const steps = stepsFor();

  return (
    <>
      {/* Granola falls into a real jar. The words are already there, so nobody
          waits on the graphics. The jar sits to the right and the words to its
          left, so nothing is read through the glass. Anyone on an old phone, a
          metered connection, or with motion switched off gets a photograph of
          the same scene and is never told they missed anything — see
          components/hero/still.js. */}
      <link rel="preload" href="/hero/plate-wide.webp" as="image" media="(orientation: landscape)" />
      <link rel="preload" href="/hero/plate-tall.webp" as="image" media="(orientation: portrait)" />
      <link rel="preload" href="/hero/jar-filled.png" as="image" />
      <link rel="preload" href="/hero/jar-empty.png" as="image" />
      <ThePour className="min-h-[84vh] w-full lg:min-h-[78vh]">
        <div className="mx-auto flex min-h-[84vh] w-full max-w-[1296px] items-end px-6 pb-10 sm:px-10 lg:min-h-[78vh] lg:items-center lg:px-18 lg:pb-0">
          <div className="flex max-w-[600px] flex-col items-start gap-5 text-left">
            <h1 className="display m-0 text-[40px] leading-[0.98] text-ink sm:text-[52px] lg:text-[66px]">
              Treats baked
              <br />
              <em className="italic text-sage">this week,</em>
              <br />a few streets away.
            </h1>
            <p className="max-w-[460px] text-[18px] leading-relaxed text-bark sm:text-[20px]">
              Organic rolled oats, organic natural sweeteners, organic nuts/fruit and not much else. Made in small
              batches in a local kitchen, with ingredients that are simple and pure, and fresh for porch pickup weekly.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-4">
              <Link href="/menu" className="stamp">
                See this week&apos;s flavors
              </Link>
              <Link href="/pickup" className="stamp stamp-light">
                How porch pickup works
              </Link>
            </div>
          </div>
        </div>
      </ThePour>

      <div className="mx-auto mt-5 w-full max-w-[1296px] px-6 sm:px-10 lg:px-18">
        <HeroShelf flavors={menuFlavors(shop.flavors)} />
      </div>


      <ReadyNow />

      <section className="grid gap-12 px-6 pt-16 sm:px-10 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-20 lg:px-18 lg:pt-[84px]">
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-4">
            <HeartSeal />
            <h2 className="display m-0 text-[38px] sm:text-[58px]">This week&apos;s menu</h2>
          </div>
          <MenuList shop={{ ...shop, flavors: menuFlavors(shop.flavors) }} />
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Link href="/menu" className="stamp">
              Browse the menu
            </Link>
            <span className="font-ui text-[14px] text-muted">
              Ingredients and allergens on every flavor. Ordering is open.
            </span>
          </div>
        </div>

        <aside className="dashed-frame flex flex-col gap-4 bg-paper px-7 pb-6 pt-7">
          <div className="small-caps">Choose your bag</div>
          <div className="pack-pair">
            <FloatingJar flavor={samplePack(shop)} format="bag" mark="none" />
          </div>
          <p className="text-[18px] leading-snug text-bark">
            Choose a 3 oz, 8 oz, or 1 lb bag. Next pickups: {nextPickups()}.
          </p>
          <p className="text-[15px] italic text-sage">Order by Tuesday at 9 p.m. for Friday or Saturday porch pickup.</p>
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
          <KitchenPhoto />
          {filled(business.ownerName) ? (
            <p className="small-caps text-muted">{filled(business.ownerName)} · founder, baker, jar washer</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div className="small-caps">Why this kitchen exists</div>
          <h2 className="display m-0 text-[40px] sm:text-[56px]">
            It started at home, in the mundane moments, and the ordinary chaos.
            <br />
          </h2>
          <div className="max-w-[620px] text-[19px] leading-relaxed text-bark sm:text-[21px]">
            <StoryNarrative />
          </div>
          <div className="flex max-w-[620px] flex-col gap-2 border-l-[3px] border-gold py-1.5 pl-6">
            <p className="verse text-[26px] text-ink sm:text-[32px]">&ldquo;{verses.work.text}&rdquo;</p>
            <div className="ref text-sage">{verses.work.reference}</div>
          </div>
        </div>
      </section>

      {/* Jar-return messaging is intentionally paused while the shop moves to sealable bags. */}
      {false && <section className="mx-6 mt-20 grid bg-brown text-cream sm:mx-10 lg:mx-18 lg:mt-[88px] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-5 px-8 py-12 sm:px-12 lg:px-16 lg:py-[72px]">
          <div className="small-caps !text-gold">The jar promise</div>
          <h2 className="display m-0 text-[48px] text-cream sm:text-[64px] lg:text-[76px]">
            This jar is
            <br />
            worth {money(jarRules.creditDollars)}.
          </h2>
          <p className="max-w-[460px] text-[19px] leading-relaxed text-linen sm:text-[21px]">
            Every jar goes out with a tag. When you reorder, tell us how many you are handing back and each one comes
            off the total before you pay. Bring them with you to pickup.
          </p>
          <p className="max-w-[460px] text-[17px] italic leading-relaxed text-gold sm:text-[18px]">
            We were given a good earth to look after. Washing a jar and using it again is a small piece of that.
          </p>
          <Link href="/menu" className="stamp stamp-gold w-fit">
            Start a jar order
          </Link>
        </div>

        <div className="relative flex min-h-[560px] items-center justify-center overflow-visible px-8 py-16">
          <div className="w-[200px] sm:w-[230px] lg:w-[250px]">
            <FloatingJar flavor={candiedJar(shop)} featured tone="brown" linked={shop.flavors.some((flavor) => /candied/i.test(`${flavor.slug} ${flavor.name}`))} />
          </div>
          <div className="absolute left-[10%] top-[34%] z-[2] w-[168px] -rotate-6 bg-cream p-2 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:left-[14%]">
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/qr.svg?v=6" alt="" width={56} height={56} className="block h-14 w-14" />
              </div>
            </div>
          </div>
        </div>
      </section>}

      {false && <section className="grid gap-10 px-6 pt-20 sm:px-10 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-[72px] lg:px-18 lg:pt-24">
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
      </section>}

      {DELIVERY_ENABLED ? <section className="mx-6 mt-20 grid gap-10 bg-sage px-8 py-14 text-cream sm:mx-10 sm:px-12 lg:mx-18 lg:mt-24 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-18 lg:py-[68px]">
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
          <Suspense>
            <BlessedCount />
          </Suspense>
        </div>
      </section> : null}

      <section className={`grid gap-12 px-6 pt-20 sm:px-10 ${REWARDS_ENABLED ? "lg:grid-cols-2" : "max-w-[900px] mx-auto"} lg:items-center lg:gap-20 lg:px-18 lg:pt-24`}>
        <div className="flex flex-col gap-4">
          <HeartSeal />
          <NeighborQuoteBody />
          <Link href="/reviews" className="mt-2 font-ui text-[14px] font-semibold text-sage hover:text-brown">
            Read the rest, or leave yours
          </Link>
        </div>

        {REWARDS_ENABLED && <div id="rewards" className="flex flex-col items-start gap-5">
          <div className="small-caps">Pantry Rewards</div>
          <h2 className="display m-0 text-[40px] sm:text-[54px]">{rewardOffer.sentence}</h2>
          <RewardsCard punched={9} href="/rewards" />
          <p className="max-w-[420px] text-[18px] leading-snug text-bark">
            Every bag and sampler bag counts toward Pantry Rewards. Your email is the card.
          </p>
        </div>}
      </section>

      <div className="mt-20 lg:mt-24">
        <ScriptureBand verse={verses.table} tone="cream" size="medium" />
      </div>
    </>
  );
}

function NeighborQuoteBody() {
  return (
    <>
      <p className="display text-[32px] italic leading-tight text-ink sm:text-[44px]">
        &ldquo;{josephReview.body}&rdquo;
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
      <div className="small-caps">{josephReview.name} · a neighbor</div>
    </>
  );
}

async function BlessedCount() {
  const blessed = await blessingBagsThisYear();
  if (blessed === null || blessed <= 0) return null;
  return (
    <div className="border-t border-cream/35 pt-4 font-ui text-[15px] text-moss">
      {blessed} blessing bag{blessed === 1 ? "" : "s"} delivered so far this year
    </div>
  );
}

function samplePack(shop: Shop): Flavor {
  return (
    shop.flavors.find((flavor) => !flavor.soldOut) ??
    shop.flavors[0] ?? {
      slug: "apple-maple-pecan",
      name: "Apple Maple Pecan",
      blurb: "",
      ingredients: "",
      allergens: "",
      bagPrice: 15,
      jarPrice: 17,
    }
  );
}

function candiedJar(shop: Shop): Flavor {
  return (
    shop.flavors.find((flavor) => /candied/i.test(`${flavor.slug} ${flavor.name}`)) ?? {
      slug: "candied-almonds",
      name: "Candied Almonds",
      blurb: "",
      ingredients: "",
      allergens: "",
      bagPrice: 9,
      jarPrice: 12,
    }
  );
}
