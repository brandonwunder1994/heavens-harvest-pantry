import type { Metadata } from "next";
import Link from "next/link";
import { HeartSeal } from "@/components/Sprite";
import { TheBowl } from "@/components/bowl/TheBowl";

export const metadata: Metadata = {
  title: "Make a bowl",
  description:
    "Drag granola, yoghurt and berries into a bowl and save the picture. Nothing to buy, nothing uploaded anywhere.",
};

export default function BowlPage() {
  return (
    <>
      <section className="flex flex-col items-center gap-3 px-6 pt-2 text-center sm:px-10 lg:px-18">
        <HeartSeal size={38} />
        <h1 className="display m-0 text-[46px] sm:text-[64px] lg:text-[76px]">Make a bowl</h1>
        <p className="mx-auto max-w-[560px] text-[19px] italic leading-snug text-sage sm:text-[22px]">
          Yoghurt, granola, berries, honey. Make the breakfast you would actually make and keep the picture.
          There is nothing to buy on this page.
        </p>
      </section>

      <div className="mt-8">
        <TheBowl />
      </div>

      <section className="mx-auto mt-12 flex w-full max-w-[900px] flex-col gap-2 px-6 pb-16 sm:px-10">
        <div className="small-caps">And then the real one</div>
        <p className="text-[18px] leading-relaxed text-bark sm:text-[20px]">
          Hers is oats, honey, olive oil and nuts, baked in small batches and left on your porch in a bag or
          a mason jar you can bring back.
        </p>
        <Link href="/menu" className="mt-3 font-ui text-[14px] font-semibold text-sage hover:text-brown">
          See this week&apos;s flavors
        </Link>
      </section>
    </>
  );
}
