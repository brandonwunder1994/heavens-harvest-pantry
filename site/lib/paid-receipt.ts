import type Stripe from "stripe";
import type { StoredOrder } from "@/lib/order-store";

type Pickup = { address: string; contact: string };
type ReceiptServices = {
  retrieve: (id: string) => Promise<Stripe.Checkout.Session>;
  recordPaid: (session: Stripe.Checkout.Session) => Promise<StoredOrder | null>;
  privatePickup: () => Promise<Pickup>;
  emailOrder: (id: string) => Promise<boolean>;
  getStoredOrder: (id: string) => Promise<StoredOrder | null>;
};
export type PaidReceipt = { paid: false } | {
  paid: true;
  stored: StoredOrder | null;
  pickup: Pickup | null;
  pickupUnavailable: boolean;
  legacyDate: string;
  legacyPeriod: string;
};

/** Payment verification is authoritative; email and receipt refresh are best effort. */
export async function readPaidReceipt(id: string | undefined, services: ReceiptServices): Promise<PaidReceipt> {
  if (!id?.startsWith("cs_")) return { paid: false };
  let session: Stripe.Checkout.Session;
  let stored: StoredOrder | null;
  try {
    session = await services.retrieve(id);
    if (session.payment_status !== "paid" || session.status !== "complete" || session.metadata?.practice === "true" ||
      !(session.metadata?.order_id || (session.metadata?.method === "dropoff" && session.metadata?.run_area === "Porch pickup"))) {
      return { paid: false };
    }
    stored = await services.recordPaid(session);
    if (session.metadata?.order_id && !stored) return { paid: false };
  } catch {
    return { paid: false };
  }

  const hasPickup = stored ? stored.snapshot.totals.lines.some(p => !p.line.gift) : true;
  const pickup = hasPickup ? await services.privatePickup().catch(() => null) : null;
  if (stored) {
    await services.emailOrder(stored.id).catch(() => false);
    stored = await services.getStoredOrder(stored.id).catch(() => null) ?? stored;
  }
  return {
    paid: true, stored, pickup: pickup?.address ? pickup : null,
    pickupUnavailable: hasPickup && !pickup?.address,
    legacyDate: session.metadata?.run_date ?? "",
    legacyPeriod: session.metadata?.pickup_period ?? "",
  };
}
