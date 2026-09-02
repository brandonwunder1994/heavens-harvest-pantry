/**
 * Review arithmetic and tidying. Import-free on purpose, so `node --test` runs
 * it straight from TypeScript with no build step.
 */

export type Review = {
  id: number;
  name: string;
  flavor: string | null;
  rating: number;
  body: string;
  approved: boolean;
  createdAt: number;
};

export type ReviewDraft = {
  name: string;
  email: string;
  flavor: string;
  rating: number;
  body: string;
};

export type ReviewCheck =
  | { ok: true; draft: ReviewDraft }
  | { ok: false; errors: Record<string, string> };

const tidy = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** What a customer typed, checked before it ever reaches the database. */
export function checkReview(input: unknown, knownFlavors: string[] = []): ReviewCheck {
  const raw = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const name = tidy(raw.name, 60);
  if (name.length < 2) errors.name = "A first name is enough, but we need one.";

  const email = tidy(raw.email, 120).toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = "That email does not look right.";
  }

  const rating = Math.round(Number(raw.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    errors.rating = "Pick one to five.";
  }

  const body = tidy(raw.body, 900);
  if (body.length < 10) errors.body = "A sentence or two, please.";

  // An unrecognised flavor is dropped rather than refused: she may have
  // renamed one since the order went out, and that is not the customer's fault.
  const flavorRaw = tidy(raw.flavor, 80);
  const flavor = knownFlavors.includes(flavorRaw) ? flavorRaw : "";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, draft: { name, email, flavor, rating, body } };
}

export function averageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

export function starLine(rating: number): string {
  const whole = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(whole) + "☆".repeat(5 - whole);
}
