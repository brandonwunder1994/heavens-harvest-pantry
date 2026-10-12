import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { business, filled } from "@/lib/content";
import { getShop } from "@/lib/settings";
import { DELIVERY_ENABLED } from "@/lib/fulfilment";

export async function generateMetadata(): Promise<Metadata> {
  if (!DELIVERY_ENABLED) return { title: "Porch pickup", robots: { index: false } };
  const { delivery } = await getShop();
  const where = delivery.runs.map((run) => `${run.area} on ${run.day}`).join(", or ");
  return {
    title: "How delivery works",
    description: `${delivery.cutoff}, she bakes ${delivery.bakeDay}, and it lands on your porch in ${where}.`,
  };
}

const stepsFor = (cutoff: string, bakeDay: string) => [
  {
    numeral: "I",
    title: cutoff,
    body: "Pick your flavors, choose a bag or a jar, and say which day suits you. It takes about a minute and there is no account to make.",
  },
  {
    numeral: "II",
    title: `She bakes ${bakeDay}.`,
    body: "Only what was ordered, so nothing sits on a shelf going stale. She prays over each name on the list before the first tray goes in.",
  },
  {
    numeral: "III",
    title: "It arrives with a text.",
    body: "You get a message when she sets out and another when it is on your porch. If you are home, she will knock. If you are not, it waits in the shade.",
  },
];

export default async function DeliveryPage() {
  if (!DELIVERY_ENABLED) redirect("/pickup");
  const { delivery } = await getShop();
  const steps = stepsFor(delivery.cutoff, delivery.bakeDay);

  return (
    <>
      <PageHeader
        eyebrow="Delivery"
        title={
          <>
            Baked Monday.
            <br />
            On your porch by Friday.
          </>
        }
        standfirst="Two neighborhoods, two days a week, delivered by the person who baked it. No couriers, no delivery fee."
      />

      <section className="mx-auto mt-14 grid w-full max-w-[1100px] gap-5 px-6 sm:px-10 lg:grid-cols-2">
        {delivery.runs.map((run) => (
          <div key={run.area} className="dashed-frame flex flex-col gap-2 bg-paper px-7 py-7">
            <div className="small-caps">{run.day}</div>
            <div className="display text-[38px]">{run.area}</div>
            <p className="text-[18px] leading-snug text-muted">
              Next run: {run.nextDate}. Orders close Sunday at 9pm for the whole week.
            </p>
          </div>
        ))}
      </section>

      <section className="mx-6 mt-12 grid border-y border-sand sm:mx-10 lg:mx-auto lg:max-w-[1100px] lg:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.numeral}
            className={`flex items-start gap-5 py-8 lg:px-8 ${i === 0 ? "lg:pl-0" : ""} ${
              i === 2 ? "lg:pr-0" : "border-b border-sand lg:border-b-0 lg:border-r"
            }`}
          >
            <span className="caps text-[30px] leading-none text-gold">{step.numeral}</span>
            <div className="flex flex-col gap-1.5">
              <div className="display text-[25px]">{step.title}</div>
              <p className="text-[17px] leading-snug text-muted">{step.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-14 grid w-full max-w-[1100px] gap-5 px-6 pb-16 sm:px-10 lg:grid-cols-3">
        <div className="dashed-frame flex flex-col gap-2 bg-paper px-6 py-6">
          <div className="display text-[26px]">Not on the route?</div>
          <p className="text-[17px] leading-snug text-muted">
            {filled(delivery.dropOff)
              ? `There is a drop-off spot at ${filled(delivery.dropOff)}.`
              : "There is a drop-off spot too."}{" "}
            Pick your order up any time that day. It is free, same as delivery.
          </p>
        </div>
        <div className="dashed-frame flex flex-col gap-2 bg-paper px-6 py-6">
          <div className="display text-[26px]">Sealable bags</div>
          <p className="text-[17px] leading-snug text-muted">
            Choose regular resealable bags or 3 oz sampler bags. Order now for the first porch pickup on Friday, October 16.
          </p>
        </div>
        <div className="dashed-frame flex flex-col gap-2 bg-paper px-6 py-6">
          <div className="display text-[26px]">Need a different day?</div>
          <p className="text-[17px] leading-snug text-muted">
            {filled(business.phone) ? `Text ${filled(business.phone)}. ` : "Ask her. "}She lives here too, so
            if you are two streets over and stuck, just ask.
          </p>
        </div>
      </section>
    </>
  );
}
