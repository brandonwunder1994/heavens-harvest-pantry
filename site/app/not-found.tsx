import Link from "next/link";
import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeartSeal } from "@/components/Sprite";
import { getShop } from "@/lib/settings";

/** Sits above the route groups, so it brings its own shop chrome. */
export default async function NotFound() {
  const shop = await getShop();

  return (
    <CartProvider shop={shop}>
      <Header shop={shop} />
      <main>
        <section className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-5 px-6 py-24 text-center sm:px-10">
          <HeartSeal size={44} />
          <h1 className="display m-0 text-[44px] sm:text-[64px]">That shelf is empty.</h1>
          <p className="max-w-md text-[19px] leading-relaxed text-bark">
            The page you were after is not here. The granola, however, is exactly where it should be.
          </p>
          <Link href="/menu" className="stamp mt-2">
            See this week&apos;s menu
          </Link>
        </section>
      </main>
      <Footer shop={shop} />
    </CartProvider>
  );
}
