import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/ShopLink";
import { CrossWheat, HeartSeal } from "@/components/Sprite";
import { CartBar } from "@/components/cart/CartBar";
import { ReorderOnArrival } from "@/components/cart/ReorderOnArrival";
import { TurnTheJar } from "@/components/menu/TurnTheJar";
import { getShop } from "@/lib/settings";
import { menuFlavors } from "@/lib/menu-groups";
import { ReadyNow } from "@/components/menu/ReadyNow";
import { PICKUP_LABEL, nextPickups } from "@/lib/fulfilment";

export const metadata: Metadata = {
  alternates: { canonical: "/menu" },
  title: "This week's menu",
  description:
    "The granola flavors baked this week, with ingredients, allergens, and resealable bag options.",
};

export default async function MenuPage() {
  const shop = await getShop();
  const { verseOfTheWeek } = shop;
  const flavors = menuFlavors(shop.flavors);

  return (
    <>
      <Suspense fallback={null}>
        <ReorderOnArrival />
      </Suspense>

      <section className="flex flex-col items-center gap-3 px-6 pt-2 text-center sm:px-10 lg:px-18">
        <HeartSeal size={38} />
        <h1 className="display m-0 text-[46px] sm:text-[64px] lg:text-[76px]">This week&apos;s menu</h1>
        <p className="text-[19px] italic text-sage sm:text-[22px]">
          {flavors.filter((f) => !f.soldOut).length} on the tray. Ordering is open. Next pickups: {nextPickups()}.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2.5 font-ui text-[12px] font-semibold text-sage-deep">
          <span className="border border-hedge bg-moss px-3 py-2">{PICKUP_LABEL}</span>
        </div>
      </section>

      <ReadyNow />

      <div id="order-next"><TurnTheJar flavors={flavors} /></div>

      <section className="mx-6 mt-4 flex flex-col items-center gap-1.5 bg-brown px-6 py-6 text-center text-cream shadow-[inset_0_0_0_4px_#5b3d1e,inset_0_0_0_5px_#c9a06a] sm:mx-10 lg:mx-auto lg:max-w-[900px]">
        <CrossWheat size={40} color="#c9a06a" />
        <p className="verse text-[26px] sm:text-[32px]">&ldquo;{verseOfTheWeek.text}&rdquo;</p>
        <div className="ref !text-[10px] text-gold">{verseOfTheWeek.reference} · this week&apos;s card</div>
      </section>

      <section className="mx-auto mt-10 flex w-full max-w-[900px] flex-col gap-2 px-6 pb-16 sm:px-10">
        <div className="small-caps">Every batch</div>
        <p className="text-[18px] leading-relaxed text-bark sm:text-[20px]">
          Organic rolled oats, organic natural sweeteners, organic fruit/nuts. Nothing you cannot pronounce. Wholesome
          ingredients. Purposeful. Made in small batches in a home kitchen that is registered with the state.
        </p>
        <Link href="/" className="mt-3 font-ui text-[14px] font-semibold text-sage hover:text-brown">
          Back to the front page
        </Link>
      </section>

      <CartBar />
    </>
  );
}
