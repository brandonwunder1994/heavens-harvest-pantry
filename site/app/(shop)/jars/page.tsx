import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Jar } from "@/components/Sprite";
import { business, money, rewardOffer, type Shop } from "@/lib/content";
import { getShop } from "@/lib/settings";

export const metadata: Metadata = {
  title: "The jar system",
  description: "Choose a mason jar instead of a bag, bring it back, and take $2 off your next order.",
};

const stepsFor = ({ jarRules }: Shop) => [
  {
    numeral: "I",
    title: "Choose the jar.",
    body: `Any flavor comes in a ${jarRules.jarSize} instead of a bag. It costs a little more the first time, and it keeps the granola crisp for weeks longer.`,
  },
  {
    numeral: "II",
    title: "Empty it. Rinse it.",
    body: "That is all the washing it needs. No labels to peel, no lids to keep track of. The tag can stay on if you like it.",
  },
  {
    numeral: "III",
    title: "Hand it back.",
    body: `Say how many at checkout and leave them out for her. Each one takes ${money(jarRules.creditDollars)} off that order and helps punch your rewards card.`,
  },
];

export default async function JarsPage() {
  const shop = await getShop();
  const { jarRules } = shop;
  const steps = stepsFor(shop);

  return (
    <>
      <PageHeader
        eyebrow="The jar promise"
        title={
          <>
            This jar is
            <br />
            worth {money(jarRules.creditDollars)}.
          </>
        }
        standfirst="Glass keeps granola fresher than a bag, and a jar that comes back is a jar nobody had to make. So we pay you to return it."
      />

      <section className="mx-auto mt-12 grid w-full max-w-[1100px] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.numeral} className="flex flex-col gap-2 border-t-2 border-brown pt-4">
              <span className="caps text-[26px] leading-none text-gold">{step.numeral}</span>
              <div className="display text-[25px]">{step.title}</div>
              <p className="text-[17px] leading-snug text-muted">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="relative mx-auto w-full max-w-[300px] bg-cream p-2 sm:max-w-[240px]">
          <div className="dashed-frame flex flex-col items-center justify-between gap-3 px-4 pb-4 pt-5">
            <div className="h-3 w-3 rounded-full border-[1.5px] border-brown" />
            <div className="flex flex-col items-center gap-1">
              <div className="caps text-[8px] text-sage">{business.shortName}</div>
              <div className="display text-center text-[30px] text-ink">
                This jar is
                <br />
                worth {money(jarRules.creditDollars)}.
              </div>
              <p className="text-center text-[13px] italic leading-snug text-muted">
                Bring it back with your next order.
              </p>
            </div>
            <div className="border border-brown bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/qr.svg?v=4" alt="" width={104} height={104} className="block h-[104px] w-[104px]" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-center text-[11px] italic leading-tight text-brown">
                &ldquo;Taste and see that the Lord is good.&rdquo;
              </p>
              <div className="caps text-[7px] text-sage">Psalm 34 : 8</div>
            </div>
          </div>
          <p className="mt-3 text-center font-ui text-[12px] text-faint">The tag that hangs on every jar.</p>
        </div>
      </section>

      <section className="mx-6 mt-16 grid gap-10 bg-brown px-8 py-12 text-cream sm:mx-10 lg:mx-auto lg:max-w-[1100px] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-16">
        <div className="flex flex-col gap-4">
          <div className="small-caps !text-gold">Why it matters</div>
          <h2 className="display m-0 text-[36px] text-cream sm:text-[46px]">
            We were given a good earth to look after.
          </h2>
          <p className="max-w-[520px] text-[19px] leading-relaxed text-linen">
            Washing a jar and using it again is a small piece of that. It is not a campaign and there is no badge for
            it. It is just the sensible thing to do with good glass, and the {money(jarRules.creditDollars)} is our way of
            saying thank you for the extra thirty seconds at the sink.
          </p>
          <Link href="/menu" className="stamp stamp-gold w-fit">
            Start a jar order
          </Link>
        </div>

        <div className="flex items-end justify-center gap-4">
          <svg viewBox="0 0 160 220" className="h-auto w-[110px]" aria-hidden focusable="false">
            <Jar x={0} y={0} />
          </svg>
          <svg viewBox="0 0 160 220" className="h-auto w-[140px]" aria-hidden focusable="false">
            <Jar x={0} y={0} />
          </svg>
          <svg viewBox="0 0 160 220" className="h-auto w-[110px] opacity-60" aria-hidden focusable="false">
            <Jar x={0} y={0} />
          </svg>
        </div>
      </section>

      <section className="mx-auto mt-14 flex w-full max-w-[820px] flex-col gap-3 px-6 pb-16 text-center sm:px-10">
        <div className="small-caps">Worth knowing</div>
        <p className="text-[18px] leading-relaxed text-bark sm:text-[20px]">
          There is no deposit and no penalty. If a jar breaks, or you decide to keep one for the pantry, that is
          completely fine. The {money(jarRules.creditDollars)} is a thank you, not a refund, and returned jars also help
          toward a free one. {rewardOffer.sentence}
        </p>
      </section>
    </>
  );
}
