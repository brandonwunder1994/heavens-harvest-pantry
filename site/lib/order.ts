import type { Shop } from "@/lib/content";
import { DELIVERY_ENABLED, pickupDate, saturdayDate, type PickupPeriod } from "@/lib/fulfilment";
import { isExtraSlug } from "@/lib/extras";
import { BLESSING_SIZES, flavorSizes, sizeLabel, OMISSIONS, cleanOmissions, type Omission } from "@/lib/products";
import {
  MAX_BLESSING_BAGS,
  MAX_JARS_RETURNED,
  priceOrder,
  type CartLine,
  type Totals,
} from "@/lib/cart";

export type FulfilmentMethod = "delivery" | "dropoff";

export type OrderDetails = {
  bakeId?: string;
  pickupPeriod?: PickupPeriod;
  requiresCooling?: boolean;
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
  /** Her own note on the order, and a log of changes she made by hand. Never shown to the customer. */
  ownerNote?: string;
  ownerLog?: string[];
  prayer: string;
  blessingGiftJars?: number;
  blessingVerse?: { reference: string; text: string; note: string; from: string; to: string };
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

  const totals = priceOrder(shop, lines, { jarsReturned, blessingBags, blessingGiftJars: rawDetails.blessingGiftJars });
  if (lines.length > 40) errors.lines = "Please keep an order to 40 different selections or fewer.";
  if (blessingBags > 0) errors.blessingBags = "Choose a flavor, size, and recipient for each blessing gift below.";
  if (jarsReturned > 0) errors.jarsReturned = "Jar returns are paused while we use resealable bags.";
  const giftIds=new Set<string>();
  for (const line of lines) {
    if (!line || typeof line !== "object") continue;
    if (isExtraSlug(line.slug) && line.gift) errors.gifts = "Ready-now extras cannot be sent as blessing gifts.";
    const flavor = shop.flavors.find(f => f.slug === line.slug);
    if (!flavor) continue;
    if (line.sizeOz !== undefined && ![3, 8, 16].includes(line.sizeOz)) errors.lines = "Choose a 3 oz, 8 oz, or 1 lb size.";
    if (line.sizeOz !== undefined && !flavorSizes(flavor).includes(line.sizeOz)) errors.lines = "That size is not offered for this flavor. Please choose again.";
    if (line.omissions !== undefined && (!Array.isArray(line.omissions) || line.omissions.some(o => !OMISSIONS.includes(o as Omission) || !flavor.allowedOmissions?.includes(o)))) errors.lines = "One ingredient option is no longer offered. Please choose again.";
    if (line.gift) {
      if(giftIds.has(line.gift.id))errors.gifts="Please add each gift as a separate recipient selection.";
      giftIds.add(line.gift.id);
      const giftSize = line.sizeOz ?? (line.format === "sampler" ? 3 : 16);
      if (!BLESSING_SIZES.some(size => size === giftSize)) errors.gifts = "Choose an 8 oz or 1 lb size for each blessing gift.";
      if (typeof line.gift.id !== "string" || !line.gift.id || clean(line.gift.recipientName, 80).length < 2 || clean(line.gift.address, 250).length < 8 || line.gift.inVistancia !== true) errors.gifts = "Each blessing gift needs a recipient, delivery address, and confirmation that it is in Vistancia.";
    }
  }

  if (totals.itemCount === 0 && totals.blessingBags === 0) {
    errors.lines = "Your order is empty.";
  }
  if (jarsReturned < 0 || jarsReturned > MAX_JARS_RETURNED) {
    errors.jarsReturned = `Between 0 and ${MAX_JARS_RETURNED} jars, please.`;
  }
  if (blessingBags < 0 || blessingBags > MAX_BLESSING_BAGS) {
    errors.blessingBags = `Between 0 and ${MAX_BLESSING_BAGS} blessing bags, please.`;
  }

  const method: FulfilmentMethod = rawDetails.method === "delivery" ? "delivery" : "dropoff";
  if (method === "delivery" && !DELIVERY_ENABLED) errors.method = "Delivery is paused. Please choose Friday or Saturday porch pickup.";

  const runArea = clean(rawDetails.runArea, 60);
  const runDate = clean(rawDetails.runDate, 40);
  // Ready-now extras are for this weekend and are checked out on their own;
  // everything else is for the next bake.
  const extraLines = totals.lines.filter(p => isExtraSlug(p.line.slug)).length;
  if (extraLines > 0 && extraLines < totals.lines.length) errors.lines = "Ready-now extras are checked out on their own. Finish this order, then order the rest for the next bake.";
  const bakeId = extraLines > 0 && extraLines === totals.lines.length && shop.extras?.weekend ? shop.extras.weekend : pickupDate();
  const hasPickup = totals.lines.some(p => !p.line.gift);
  if (hasPickup && runDate !== bakeId && runDate !== saturdayDate(bakeId)) errors.runDate = "Choose an available Friday or Saturday pickup date.";
  if (hasPickup && rawDetails.pickupPeriod !== "morning" && rawDetails.pickupPeriod !== "afternoon") errors.pickupPeriod = "Choose morning or afternoon pickup.";
  const matched = shop.delivery.runs.findIndex((r) => r.area === runArea && r.nextDate === runDate);
  if (method === "delivery" && matched < 0) {
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
        runArea: method === "delivery" ? runArea : "Porch pickup",
        runDate: hasPickup ? runDate : bakeId,
        bakeId,
        pickupPeriod: hasPickup ? rawDetails.pickupPeriod : undefined,
        requiresCooling: totals.lines.some(p => !p.line.gift && p.flavor.requiresCooling),
        name,
        phone,
        address: method === "delivery" ? address : "Vistancia",
        note: clean(rawDetails.note),
        prayer: clean(rawDetails.prayer, 500),
        blessingGiftJars: totals.blessingGiftJars,
        blessingVerse: undefined,
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
  const run = order.details.method === "delivery" ? shop.delivery.runs[order.details.runIndex] : null;
  return {
    customer_name: order.details.name,
    phone: order.details.phone,
    method: order.details.method,
    run_area: run?.area ?? "Porch pickup",
    run_date: run?.nextDate ?? order.details.runDate,
    bake_id: order.details.bakeId ?? order.details.runDate,
    pickup_period: order.details.pickupPeriod ?? "",
    requires_cooling: order.details.requiresCooling ? "yes" : "no",
    address: order.details.address,
    porch_note: order.details.note,
    prayer_request: order.details.prayer,
    blessing_gift_jars: String(order.details.blessingGiftJars ?? 0),
    blessing_verse: order.details.blessingVerse ? JSON.stringify(order.details.blessingVerse).slice(0, 480) : "",
    jars_returned: String(order.jarsReturned),
    blessing_bags: String(order.blessingBags+totals.lines.filter(p=>p.line.gift).reduce((n,p)=>n+p.line.qty,0)),
    jar_credit_cents: String(totals.jarCreditAppliedCents),
    points_earned: String(totals.points),
    items: totals.lines
      // The name somebody asked for goes on the ticket she reads in the
      // kitchen, because a label with the wrong name on it is worse than none.
      .map((p) => `${p.line.qty}x ${p.flavor.name}${p.line.name ? ` for ${p.line.name}` : ""}${p.line.sizeOz ? ` ${sizeLabel(p.line.sizeOz)}` : ""}${cleanOmissions(p.line.omissions).length ? ` ${cleanOmissions(p.line.omissions).join(",")}` : ""} (${p.line.format})`)
      .join("; ")
      .slice(0, 480),
  };
}
