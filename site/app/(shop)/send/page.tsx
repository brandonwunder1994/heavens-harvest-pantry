import type { Metadata } from "next";
import Link from "@/components/ShopLink";
import { HeartSeal } from "@/components/Sprite";
import { SendWithAVerse } from "@/components/gift/SendWithAVerse";
import { everyVerse } from "@/lib/verses";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Send it with a verse",
  description:
    "Choose one of her verses, write a line or two, and send somebody a card that comes wrapped. Free, and no account needed.",
};

export default function SendPage() {
  redirect("/blessing-bags");
  const verses = everyVerse().map((v) => ({ ref: v.ref, text: v.text }));

  return (
    <>
      <section className="flex flex-col items-center gap-3 px-6 pt-2 text-center sm:px-10 lg:px-18">
        <HeartSeal size={38} />
        <h1 className="display m-0 text-[46px] sm:text-[64px] lg:text-[76px]">Send it with a verse</h1>
        <p className="mx-auto max-w-[600px] text-[19px] italic leading-snug text-sage sm:text-[22px]">
          A card to go with a jar, or on its own. Choose the verse, write a line or two, and send them the
          link. They pull the string and the paper comes off.
        </p>
      </section>

      <div className="mt-9">
        <SendWithAVerse verses={verses} />
      </div>

      <section className="mx-auto mt-14 flex w-full max-w-[900px] flex-col gap-2 px-6 pb-16 sm:px-10">
        <div className="small-caps">Nothing to sign up for</div>
        <p className="text-[18px] leading-relaxed text-bark sm:text-[20px]">
          There is no account and no email address on a card. Whoever has the link has the card, which is
          how a card works. Web addresses are left off, so nothing sent this way can carry anybody anywhere
          else.
        </p>
        <Link href="/menu" className="mt-3 font-ui text-[14px] font-semibold text-sage hover:text-brown">
          Send a jar with it
        </Link>
      </section>
    </>
  );
}
