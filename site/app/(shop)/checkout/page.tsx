import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { isTestMode, paymentsConfigured } from "@/lib/stripe";
import { business } from "@/lib/content";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Finish your granola order. About a minute, and no account needed.",
  robots: { index: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 pb-16 sm:px-10">
      <div className="flex flex-col items-center gap-1.5 pt-2 text-center">
        <Link href="/menu" aria-label={`${business.name}, back to the menu`}>
          <Image src="/logo.webp" alt="" width={160} height={160} className="h-16 w-16" />
        </Link>
        <h1 className="display m-0 text-[40px]">Checkout</h1>
        <p className="text-[17px] italic text-sage">About a minute. No account needed.</p>
      </div>

      {cancelled ? (
        <div
          role="status"
          className="dashed-frame mt-6 bg-paper px-5 py-4 font-ui text-[14px] leading-relaxed text-bark"
        >
          Payment was cancelled and nothing has been charged. Your order is still here whenever you want it.
        </div>
      ) : null}

      <CheckoutForm paymentsLive={paymentsConfigured()} testMode={isTestMode()} />
    </div>
  );
}
