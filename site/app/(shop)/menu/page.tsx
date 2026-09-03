import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CrossWheat, HeartSeal, Jar } from "@/components/Sprite";
import { jarLabel } from "@/components/HeroShelf";
import { AddToCart } from "@/components/cart/AddToCart";
import { CartBar } from "@/components/cart/CartBar";
import { ReorderOnArrival } from "@/components/cart/ReorderOnArrival";
import { WhatShouldITry } from "@/components/suggest/WhatShouldITry";
import { TurnTheJar } from "@/components/menu/TurnTheJar";
import { amount, money } from "@/lib/content";
import { getShop } from "@/lib/settings";

export const metadata: Metadata = {
  title: "This week's menu",
  description:
    "The granola flavors baked this week, with ingredients, allergens, and the price for a bag or a mason jar.",
};

export default async function MenuPage() {
  const shop = await getShop();
  const { blessingBag, delivery, flavors, jarRules, verseOfTheWeek } = shop;

  return (
    <>
      {/* Somebody arriving from the one-tap reorder on their own page. */}
      <Suspense fallback={null}>
        <ReorderOnArrival />
      </Suspense>

      <section className="flex flex-col items-center gap-3 px-6 pt-2 text-center sm:px-10 lg:px-18">
        <HeartSeal size={38} />
        <h1 className="display m-0 text-[46px] sm:text-[64px] lg:text-[76px]">This week&apos;s menu</h1>
        <p className="text-[19px] italic text-sage sm:text-[22px]">
          {flavors.filter((f) => !f.soldOut).length} on the tray. {delivery.cutoff}.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2.5 font-ui text-[12px] font-semibold text-sage-deep">
          {delivery.runs.map((run) => (
            <span key={run.area} className="border border-hedge bg-moss px-3 py-2">
              {run.area} · {run.nextDate}
            </span>
          ))}
        </div>
      </section>

      {/* Pick the jar up and turn it. The drawing it replaces is handed in as
          the fallback, so anyone not being given the real one still gets the
          shelf that was always here. */}
      <TurnTheJar flavors={flavors}>
        <div className="mx-auto mt-6 w-full max-w-[900px]">
          <svg viewBox="0 0 900 250" className="h-auto w-full" aria-hidden focusable="false">
            {/* Her three, not three she chose once. */}
            <Jar x={140} y={40} scale={0.95} label={jarLabel(flavors[0]?.name ?? "")} />
            <Jar x={370} y={14} scale={1.12} label={jarLabel(flavors[1]?.name ?? "")} />
            <Jar x={620} y={40} scale={0.95} label={jarLabel(flavors[2]?.name ?? "")} />
            <path d="M100 232 H800" stroke="#5b3d1e" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M130 240 H770" stroke="#5b3d1e" strokeWidth="0.9" opacity="0.4" />
          </svg>
        </div>
      </TurnTheJar>

      <section className="mx-6 mt-4 flex flex-col items-center gap-1.5 bg-brown px-6 py-6 text-center text-cream shadow-[inset_0_0_0_4px_#5b3d1e,inset_0_0_0_5px_#c9a06a] sm:mx-10 lg:mx-auto lg:max-w-[900px]">
        <CrossWheat size={40} color="#c9a06a" />
        <p className="verse text-[26px] sm:text-[32px]">&ldquo;{verseOfTheWeek.text}&rdquo;</p>
        <div className="ref !text-[10px] text-gold">{verseOfTheWeek.reference} · this week&apos;s card</div>
      </section>

      <section className="mx-auto mt-12 flex w-full max-w-[900px] flex-col px-6 sm:px-10">
        {flavors.map((flavor) => (
          <article
            key={flavor.slug}
            id={flavor.slug}
            className="flex scroll-mt-24 flex-col gap-3 border-t border-sand py-7"
          >
            <div className={`leader ${flavor.soldOut ? "opacity-60" : ""}`}>
              <h2 className="display m-0 text-[28px] sm:text-[34px]">{flavor.name}</h2>
              <span className="leader-dots hidden sm:block" />
              <span className="whitespace-nowrap font-ui text-[14px] font-semibold text-brown">
                bag {money(flavor.bagPrice)} · jar {money(flavor.jarPrice)}
              </span>
            </div>

            <p className={`text-[19px] italic leading-snug text-muted ${flavor.soldOut ? "opacity-60" : ""}`}>
              {flavor.blurb}
            </p>

            <dl className="grid gap-x-8 gap-y-1.5 font-ui text-[13px] leading-relaxed text-muted sm:grid-cols-[110px_1fr]">
              <dt className="small-caps !text-[10px] text-faint">Ingredients</dt>
              <dd className="m-0">{flavor.ingredients}</dd>
              <dt className="small-caps !text-[10px] text-faint">Allergens</dt>
              <dd className="m-0">{flavor.allergens}</dd>
            </dl>

            {flavor.soldOut ? (
              <div className="flex flex-wrap items-center gap-4">
                <span className="caps w-fit -rotate-2 border-2 border-brown px-2.5 py-1.5 text-[10px] text-brown">
                  Sold out · back {flavor.backOn}
                </span>
                <span className="font-ui text-[13px] font-semibold text-sage underline">
                  Text me when it&apos;s back
                </span>
              </div>
            ) : (
              <AddToCart flavor={flavor} />
            )}
          </article>
        ))}
      </section>

      {/* Read the list and still cannot choose? Four questions. It reads her
          real flavours, so it can never name one she has renamed or taken off. */}
      <div className="mt-14">
        <WhatShouldITry flavors={flavors} />
      </div>

      <section className="mx-auto mt-10 grid w-full max-w-[900px] gap-4 px-6 pb-4 sm:px-10 lg:grid-cols-2">
        <div className="dashed-frame flex items-center gap-4 bg-paper px-5 py-4">
          <svg viewBox="0 0 160 220" className="h-auto w-[34px] shrink-0" aria-hidden focusable="false">
            <Jar x={0} y={0} />
          </svg>
          <p className="text-[16px] leading-snug text-bark">
            <strong className="font-semibold">Jars to hand back?</strong> Say how many at checkout. Each one is $
            {amount(jarRules.creditDollars)} off.
          </p>
        </div>

        <div className="dashed-frame flex items-center gap-4 bg-moss px-5 py-4">
          <CrossWheat size={34} color="#4f5a35" />
          <p className="text-[16px] leading-snug text-sage-deep">
            <strong className="font-semibold">Bless a neighbor.</strong> Add a {money(blessingBag.price)} bag at checkout for
            someone who needs one this week.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 flex w-full max-w-[900px] flex-col gap-2 px-6 pb-16 sm:px-10">
        <div className="small-caps">Every batch</div>
        <p className="text-[18px] leading-relaxed text-bark sm:text-[20px]">
          Rolled oats, honey, olive oil, nuts, a pinch of salt. Nothing you cannot pronounce. Made in a home kitchen
          that is registered with the state, in batches small enough that she knows whose porch each one is going to.
        </p>
        <Link href="/" className="mt-3 font-ui text-[14px] font-semibold text-sage hover:text-brown">
          Back to the front page
        </Link>
      </section>

      <CartBar />
    </>
  );
}
