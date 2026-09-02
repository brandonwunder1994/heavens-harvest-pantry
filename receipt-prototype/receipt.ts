// The receipt.
//
// Her confirmation prints like the ticket that goes up in a kitchen, with the
// week's verse at the bottom. People screenshot a beautiful receipt. Nobody has
// ever screenshotted a payment confirmation email.
//
// This file is the ticket's facts and nothing about how it looks. Everything
// here is derived from what Stripe already recorded, so the ticket can never
// disagree with what was actually charged.

export type ReceiptLine = {
  /** As it appeared at checkout, e.g. "Honey Almond Crunch · mason jar". */
  what: string;
  qty: number;
  /** What that whole line came to, in cents. */
  cents: number;
};

export type Receipt = {
  number: string;
  placedAt: Date;
  firstName: string;
  lines: ReceiptLine[];
  jarsReturned: number;
  /** What actually came off this order. */
  jarCreditCents: number;
  /** What the jars were worth, before the minimum-charge floor. */
  jarCreditAskedCents: number;
  totalCents: number;
  pointsEarned: number;
  /** Their running total, or null while the payment webhook is still landing. */
  pointsBalance: number | null;
  method: "delivery" | "dropoff" | null;
  runArea: string;
  runDate: string;
  porchNote: string;
  verse: { text: string; reference: string };
};

/**
 * A short number a person can read down a phone.
 *
 * Taken from the end of the payment's own id, so she can paste it into Stripe's
 * search and land on the right order. Six characters is not unique across all
 * time — it does not need to be. It is the number on a ticket in a home
 * kitchen, and the date beside it settles any argument.
 */
export function ticketNumber(sessionId: string): string {
  const tail = sessionId.replace(/^cs_(test|live)_/, "").replace(/[^a-zA-Z0-9]/g, "");
  const six = tail.slice(-6).toUpperCase();
  return six.length === 6 ? `${six.slice(0, 3)}-${six.slice(3)}` : "PENDING";
}

/**
 * How many jars' worth of credit did not fit.
 *
 * A card cannot be charged nothing, so a big jar return against a small order
 * gets trimmed. Saying so on the ticket is better than quietly showing a
 * smaller number than she expected.
 */
export function creditShortfallCents(receipt: Receipt): number {
  return Math.max(0, receipt.jarCreditAskedCents - receipt.jarCreditCents);
}

/** What each part of the ticket adds up to, laid out the way it prints. */
export function subtotalCents(receipt: Receipt): number {
  return receipt.lines.reduce((sum, line) => sum + line.cents, 0);
}

/**
 * The one line under the total, in her voice, about what happens next.
 * Never guesses: when the run is not known it says the plain true thing.
 */
export function whatHappensNext(receipt: Receipt): string {
  const jars =
    receipt.jarsReturned > 0
      ? ` Leave your ${receipt.jarsReturned} jar${receipt.jarsReturned === 1 ? "" : "s"} out and she will take ${receipt.jarsReturned === 1 ? "it" : "them"}.`
      : "";

  if (receipt.runArea && receipt.runDate) {
    const where = receipt.method === "dropoff" ? "waiting for you at" : "on your porch in";
    return `She bakes Monday, and it is ${where} ${receipt.runArea} on ${receipt.runDate}.${jars}`;
  }
  return `She bakes Monday and will text you when she sets out.${jars}`;
}

/** The date as it prints on the ticket: short, and with the time, like a docket. */
export function stamp(when: Date): string {
  const date = when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

type Stripeish = {
  id: string;
  created?: number | null;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
};

type LineItemish = {
  description?: string | null;
  quantity?: number | null;
  amount_total?: number | null;
};

/**
 * Builds the ticket from the payment Stripe already has, so there is one set of
 * numbers in the world rather than two.
 */
export function receiptFrom(
  session: Stripeish,
  lineItems: LineItemish[],
  verse: { text: string; reference: string },
  pointsBalance: number | null = null,
): Receipt {
  const meta = session.metadata ?? {};
  const method = meta.method === "delivery" || meta.method === "dropoff" ? meta.method : null;

  return {
    number: ticketNumber(session.id),
    placedAt: new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000),
    firstName: (meta.customer_name ?? "").trim().split(/\s+/)[0] ?? "",
    lines: lineItems.map((item) => ({
      what: item.description ?? "Granola",
      qty: item.quantity ?? 1,
      cents: item.amount_total ?? 0,
    })),
    jarsReturned: Number(meta.jars_returned ?? 0) || 0,
    jarCreditCents: Number(meta.jar_credit_cents ?? 0) || 0,
    jarCreditAskedCents: Number(meta.jar_credit_asked_cents ?? meta.jar_credit_cents ?? 0) || 0,
    totalCents: session.amount_total ?? 0,
    pointsEarned: Number(meta.points_earned ?? 0) || 0,
    pointsBalance,
    method,
    runArea: meta.run_area ?? "",
    runDate: meta.run_date ?? "",
    porchNote: (meta.porch_note ?? "").trim(),
    verse,
  };
}
