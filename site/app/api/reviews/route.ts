import { NextResponse } from "next/server";
import { databaseReady } from "@/lib/db";
import { checkReview } from "@/lib/reviews";
import { addReview } from "@/lib/reviews-source";
import { readShop } from "@/lib/settings";

/**
 * A customer sending a review. It is checked here, saved unapproved, and does
 * not appear anywhere on the site until the owner puts it there.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // If her flavor list could not be read, the one the customer picked would be
  // measured against the built-in samples and quietly dropped. Better to ask
  // them to try again in a moment than to lose it.
  const { shop, live } = await readShop();
  if (databaseReady && !live) {
    return NextResponse.json(
      { error: "save_failed", message: "It did not go through. Please try again in a moment." },
      { status: 502 },
    );
  }

  const result = checkReview(
    body,
    shop.flavors.map((flavor) => flavor.name),
  );

  if (!result.ok) {
    return NextResponse.json({ error: "invalid", errors: result.errors }, { status: 422 });
  }

  if (!databaseReady) {
    return NextResponse.json(
      { error: "not_configured", message: "Reviews are not switched on yet." },
      { status: 503 },
    );
  }

  try {
    await addReview(result.draft);
  } catch (error) {
    console.error("[reviews] could not save", error);
    return NextResponse.json(
      { error: "save_failed", message: "It did not go through. Please try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({ received: true });
}
