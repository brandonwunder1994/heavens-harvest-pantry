import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/ShopLink";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getStripe, isTestMode, paymentsConfigured } from "@/lib/stripe";
import { pickupDate } from "@/lib/fulfilment";
import { checkoutTaxConfiguration } from "@/lib/checkout-tax";
import { business } from "@/lib/content";
import { mailReady } from "@/lib/mailer";
import { readCheckoutTaxDisplay } from "@/lib/checkout-tax-source";

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
  const tax = checkoutTaxConfiguration(process.env);
  const taxDisplay = await readCheckoutTaxDisplay(tax, getStripe(), !isTestMode());

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

      <CheckoutForm paymentsLive={paymentsConfigured() && tax.ready} taxDisplay={taxDisplay} confirmationEmailAvailable={mailReady} testMode={isTestMode()} pickupDate={pickupDate()} />
    </div>
  );
}
