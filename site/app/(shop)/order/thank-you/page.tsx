import type { Metadata } from "next";
import Link from "@/components/ShopLink";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";
import { HeartSeal } from "@/components/Sprite";
import { ClearCartOnMount } from "@/components/checkout/ClearCartOnMount";
import { getStripe } from "@/lib/stripe";
import { recordPaid, privatePickup, emailOrder, getStoredOrder } from "@/lib/order-store";
import { readPaidReceipt } from "@/lib/paid-receipt";
import { mailReady } from "@/lib/mailer";
import { pickupDateLabel, ADDRESS_NOTE } from "@/lib/fulfilment";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: id } = await searchParams;
  const stripe = getStripe();
  const receipt = stripe ? await readPaidReceipt(id, {
    retrieve: sessionId => stripe.checkout.sessions.retrieve(sessionId),
    recordPaid, privatePickup, emailOrder, getStoredOrder,
  }) : { paid: false as const };

  if (receipt.paid && receipt.stored) {
    const row = receipt.stored;
    return <OrderConfirmation stored={row} pickup={receipt.pickup} pickupUnavailable={receipt.pickupUnavailable}
      confirmationEmailAvailable={mailReady}
      tax={Math.max(0, (row.amount_cents ?? row.snapshot.totals.totalCents) - row.snapshot.totals.totalCents)} />;
  }

  return <div className="mx-auto flex w-full max-w-[700px] flex-col items-center gap-6 px-6 pb-20 text-center sm:px-10">
    {receipt.paid && <ClearCartOnMount receiptId={`legacy:${id}`} />}
    <HeartSeal size={48} />
    <h1 className="display text-[44px] sm:text-[58px]">{receipt.paid ? "Thank you. Your order is confirmed." : "Check your payment status."}</h1>
    {receipt.paid ? <>
      <p className="text-[20px] text-bark">Your payment is complete and your order is on the list.</p>
      {receipt.pickup && <section className="w-full border border-sage bg-paper p-6 text-left">
        <h2 className="display text-[28px]">Your porch pickup</h2>
        <p className="mt-3 text-[19px]">{pickupDateLabel(receipt.legacyDate)}{receipt.legacyPeriod ? `, ${receipt.legacyPeriod}` : ""}</p>
        <p className="mt-5 text-[20px]">{receipt.pickup.address}</p>
        {receipt.pickup.contact && <p className="mt-3">Questions? {receipt.pickup.contact}</p>}
        <p className="mt-3 font-ui text-[12px] text-muted">{ADDRESS_NOTE}</p>
      </section>}
      {receipt.pickupUnavailable && <p role="status">Your payment is confirmed. Pickup details could not load just now. Save this link and refresh it to see your address; do not pay again.</p>}
      <p className="font-ui text-[14px] text-muted">Keep this page for your order details.</p>
    </> : <p className="max-w-[55ch] text-[19px] text-muted">We could not verify payment from this link. If you already paid, save this link and refresh it before trying another payment. Pickup details are shared only after payment is verified.</p>}
    <div className="flex flex-wrap justify-center gap-3"><Link href="/" className="stamp stamp-light">Back to the shop</Link>{receipt.paid && <Link href="/reviews#leave-one" className="stamp stamp-light">Leave a review</Link>}</div>
  </div>;
}
