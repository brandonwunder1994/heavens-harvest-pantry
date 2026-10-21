import { NextResponse } from "next/server";
import { spend } from "@/lib/attempts";
import { databaseReady } from "@/lib/db";
import { checkEntry, roundKey } from "@/lib/giveaway";
import { sendEntryReceived } from "@/lib/giveaway-mail";
import { addEntry, readGiveaway } from "@/lib/giveaway-store";

const tryAgain = "It did not go through. Please try again in a moment.";

/**
 * Someone entering the monthly giveaway. One entry per email and per Instagram
 * name each month; the database enforces it, this route explains it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!spend(`giveaway:${address}`, 8, 60 * 60_000)) {
    return NextResponse.json({ error: "slow_down", message: "That is a lot of tries. Please wait a little while and try again." }, { status: 429 });
  }

  const result = checkEntry(body);
  if (!result.ok) return NextResponse.json({ error: "invalid", errors: result.errors }, { status: 422 });

  if (!databaseReady) {
    return NextResponse.json({ error: "not_configured", message: "The giveaway is not switched on yet." }, { status: 503 });
  }

  const { setting, live } = await readGiveaway();
  if (!live) return NextResponse.json({ error: "save_failed", message: tryAgain }, { status: 502 });
  if (!setting.open) {
    return NextResponse.json({ error: "closed", message: "The giveaway is not open right now. Check back soon." }, { status: 409 });
  }

  const round = roundKey(setting);
  try {
    const added = await addEntry(round, result.draft);
    if (added === "duplicate_email") {
      return NextResponse.json({ error: "invalid", errors: { email: "That email is already entered this month. One entry each." } }, { status: 422 });
    }
    if (added === "duplicate_instagram") {
      return NextResponse.json({ error: "invalid", errors: { instagram: "That Instagram name is already entered this month. One entry each." } }, { status: 422 });
    }
  } catch (error) {
    console.error("[giveaway] could not save the entry", error);
    return NextResponse.json({ error: "save_failed", message: tryAgain }, { status: 502 });
  }

  // The entry is saved; a mail hiccup must not make it look like it was not.
  await sendEntryReceived(result.draft, setting, round);

  return NextResponse.json({ received: true });
}
