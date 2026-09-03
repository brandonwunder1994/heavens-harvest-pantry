import type { Shop } from "@/lib/content";
import {
  MAX_BLESSING_BAGS,
  MAX_JARS_RETURNED,
  priceOrder,
  type CartLine,
  type Totals,
} from "@/lib/cart";

export type FulfilmentMethod = "delivery" | "dropoff";

export type OrderDetails = {
  method: FulfilmentMethod;
  /**
   * Which delivery day was chosen. Sent as the neighborhood and date rather
   * than a position in the list: she can remove a run, and everything after it
   * shifts up, which would silently book somebody onto the wrong neighborhood.
   */
  runIndex: number;
  runArea: string;
  runDate: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  prayer: string;
};

export type OrderRequest = {
  lines: CartLine[];
  jarsReturned: number;
  blessingBags: number;
  details: OrderDetails;
};

export type ValidationResult =
  | { ok: true; order: OrderRequest; totals: Totals }
  | { ok: false; errors: Record<string, string> };

const MAX_TEXT = 300;

const clean = (value: unknown, max = MAX_TEXT): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Loose on purpose: people write phone numbers every which way. */
export function normalisePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return digits ? `+${digits}` : "";
}

export function validateOrder(shop: Shop, input: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const body = (input ?? {}) as Partial<OrderRequest>;
  const rawDetails = (body.details ?? {}) as Partial<OrderDetails>;

  const lines = Array.isArray(body.lines) ? (body.lines as CartLine[]) : [];
  const jarsReturned = Number(body.jarsReturned) || 0;
  const blessingBags = Number(body.blessingBags) || 0;

  const totals = priceOrder(shop, lines, { jarsReturned, blessingBags });

  if (totals.itemCount === 0 && totals.blessingBags === 0) {
    errors.lines = "Your order is empty.";
  }
  if (jarsReturned < 0 || jarsReturned > MAX_JARS_RETURNED) {
    errors.jarsReturned = `Between 0 and ${MAX_JARS_RETURNED} jars, please.`;
  }
  if (blessingBags < 0 || blessingBags > MAX_BLESSING_BAGS) {
    errors.blessingBags = `Between 0 and ${MAX_BLESSING_BAGS} blessing bags, please.`;
  }

  const method: FulfilmentMethod = rawDetails.method === "dropoff" ? "dropoff" : "delivery";

  const runArea = clean(rawDetails.runArea, 60);
  const runDate = clean(rawDetails.runDate, 40);
  const matched = shop.delivery.runs.findIndex((r) => r.area === runArea && r.nextDate === runDate);
  if (matched < 0) {
    errors.runIndex = runArea
      ? "That delivery day is not being offered any more. Please pick another."
      : "Pick a delivery day.";
  }
  const runIndex = Math.max(0, matched);

  const name = clean(rawDetails.name, 80);
  if (name.length < 2) errors.name = "We need a name for the order.";

  const phoneRaw = clean(rawDetails.phone, 40);
  const phone = normalisePhone(phoneRaw);
  if (phone.replace(/\D/g, "").length < 10) errors.phone = "A 10-digit phone number, please.";

  const address = clean(rawDetails.address, 200);
  if (method === "delivery" && address.length < 6) {
    errors.address = "We need somewhere to leave it.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    totals,
    order: {
      lines: totals.lines.map((p) => p.line),
      // The clamped figures, so the order that gets charged is the order that
      // was priced. Never the raw numbers off the wire.
      jarsReturned: totals.jarsReturned,
      blessingBags: totals.blessingBags,
      details: {
        method,
        runIndex,
        runArea,
        runDate,
        name,
        phone,
        address: method === "delivery" ? address : shop.delivery.dropOff,
        note: clean(rawDetails.note),
        prayer: clean(rawDetails.prayer, 500),
      },
    },
  };
}

/** Flattened for Stripe metadata, which only takes short strings. */
export function orderMetadata(
  shop: Shop,
  order: OrderRequest,
  totals: Totals,
): Record<string, string> {
  const run = shop.delivery.runs[order.details.runIndex];
  return {
    customer_name: order.details.name,
    phone: order.details.phone,
    method: order.details.method,
    run_area: run.area,
    run_date: run.nextDate,
    address: order.details.address,
    porch_note: order.details.note,
    prayer_request: order.details.prayer,
    jars_returned: String(order.jarsReturned),
    blessing_bags: String(order.blessingBags),
    jar_credit_cents: String(totals.jarCreditAppliedCents),
    points_earned: String(totals.points),
    items: totals.lines
      // The name somebody asked for goes on the ticket she reads in the
      // kitchen, because a label with the wrong name on it is worse than none.
      .map((p) => `${p.line.qty}x ${p.flavor.name}${p.line.name ? ` for ${p.line.name}` : ""} (${p.line.format})`)
      .join("; ")
      .slice(0, 480),
  };
}
