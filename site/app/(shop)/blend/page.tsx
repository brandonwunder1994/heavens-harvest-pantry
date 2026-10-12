import type { Metadata } from "next";
import Link from "@/components/ShopLink";
import { HeartSeal } from "@/components/Sprite";
import { BuildYourBlend } from "@/components/blend/BuildYourBlend";
import { CartBar } from "@/components/cart/CartBar";
import { getShop } from "@/lib/settings";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Build your own jar",
  description:
    "Choose what goes in it, put a name on the label, and see the jar before you order. Everything you can build is something she already bakes.",
};

export default async function BlendPage() {
  redirect("/menu");
  const shop = await getShop();

  return (
    <>
      <section className="flex flex-col items-center gap-3 px-6 pt-2 text-center sm:px-10 lg:px-18">
        <HeartSeal size={38} />
        <h1 className="display m-0 text-[46px] sm:text-[64px] lg:text-[76px]">Build your own jar</h1>
        <p className="mx-auto max-w-[620px] text-[19px] italic leading-snug text-sage sm:text-[22px]">
          Choose what goes in it and put a name on the label. Everything you can build here is something she
          already bakes, so it comes out of the same oven on the same morning as everything else.
        </p>
      </section>

      <div className="mt-8">
        <BuildYourBlend flavors={shop.flavors} />
      </div>

      <section className="mx-auto mt-12 flex w-full max-w-[900px] flex-col gap-2 px-6 pb-16 sm:px-10">
        <div className="small-caps">A jar with a name on it</div>
        <p className="text-[18px] leading-relaxed text-bark sm:text-[20px]">
          The name you type is printed on the label and written on her ticket, so the jar that arrives on the
          porch is the one you meant. It costs nothing extra.
        </p>
        <Link href="/menu" className="mt-3 font-ui text-[14px] font-semibold text-sage hover:text-brown">
          Back to this week&apos;s menu
        </Link>
      </section>

      <CartBar />
    </>
  );
}
