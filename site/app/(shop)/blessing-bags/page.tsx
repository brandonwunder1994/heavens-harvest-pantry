import type { Metadata } from "next";
import { PageHeader, NotYetLive } from "@/components/PageHeader";
import { paymentsConfigured } from "@/lib/stripe";
import { ScriptureBand } from "@/components/ScriptureBand";
import { business, filled, money, type Shop } from "@/lib/content";
import { getShop } from "@/lib/settings";
import { blessingBagsThisYear } from "@/lib/orders-source";

export async function generateMetadata(): Promise<Metadata> {
  const { blessingBag } = await getShop();
  return {
    title: "Blessing bags",
    description: `Add ${money(blessingBag.price)} at checkout and a bag of granola lands on the porch of a neighbor who could use one.`,
  };
}

const howFor = ({ blessingBag }: Shop) => [
  {
    numeral: "I",
    title: "Add one at checkout.",
    body: `${money(blessingBag.price)}, on top of your own order. You can add more than one.`,
  },
  {
    numeral: "II",
    title: "Give a name, or don't.",
    body: "Tell her who it should go to, or leave it to her. She keeps a quiet list of people she has been told about.",
  },
  {
    numeral: "III",
    title: "It goes out with the run.",
    body: "Same week, same porch delivery, with a card. Your name goes on it only if you say so.",
  },
];

export default async function BlessingBagsPage() {
  const [shop, blessed] = await Promise.all([getShop(), blessingBagsThisYear()]);
  const { blessingBag, verses } = shop;
  const how = howFor(shop);

  return (
    <>
      <PageHeader
        eyebrow="Blessing bags"
        title={
          <>
            Add a bag for
            <br />
            someone else.
          </>
        }
        standfirst={blessingBag.blurb}
      />

      <section className="mx-auto mt-14 grid w-full max-w-[1100px] gap-5 px-6 sm:px-10 lg:grid-cols-3">
        {how.map((step) => (
          <div key={step.numeral} className="flex flex-col gap-2 border-t-2 border-sage pt-4">
            <span className="caps text-[26px] leading-none text-gold">{step.numeral}</span>
            <div className="display text-[26px]">{step.title}</div>
            <p className="text-[17px] leading-snug text-muted">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-14 grid w-full max-w-[1100px] gap-5 px-6 sm:px-10 lg:grid-cols-2">
        <div className="dashed-frame flex flex-col gap-3 bg-paper px-7 py-7">
          <div className="small-caps">Know someone?</div>
          <p className="text-[18px] leading-relaxed text-bark">
            You do not have to buy a bag to suggest a name. If someone on your street is in a hard season, text{" "}
            {filled(business.phone) || "her"} and she will put them on the list. No explanation needed, and nobody is told who
            mentioned them.
          </p>
        </div>
        <div className="dashed-frame flex flex-col gap-3 bg-moss px-7 py-7">
          <div className="small-caps !text-sage-deep">For churches and small groups</div>
          <p className="text-[18px] leading-relaxed text-sage-deep">
            A group can order a batch of blessing bags at once for a visitation list, a new-mom ministry, or a week of
            hospital visits. Text her and she will work out the count and the timing with you.
          </p>
        </div>
      </section>

      <div className="mt-16">
        <ScriptureBand verse={verses.giving} tone="sage" size="medium">
          {blessed !== null && blessed > 0
            ? `${blessed} blessing bag${blessed === 1 ? "" : "s"} have gone out so far this year.`
            : "Every one of these goes out with the same week's run."}
        </ScriptureBand>
      </div>

      <section className="mx-auto mt-12 w-full px-6 pb-16 sm:px-10">
        {paymentsConfigured() ? null : (
          <NotYetLive note="You can add a blessing bag to an order now. Paying for it is waiting on her card account, which is one signup away." />
        )}
      </section>
    </>
  );
}
