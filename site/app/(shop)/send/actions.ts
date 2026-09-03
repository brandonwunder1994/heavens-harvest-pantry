"use server";

import { headers } from "next/headers";
import { spend } from "@/lib/attempts";
import { checkGift } from "@/lib/gift";
import { keepGift } from "@/lib/gift-store";
import { everyVerse } from "@/lib/verses";

/** A handful an hour per address. See lib/attempts.ts for why. */
const ALLOWED = 6;
const AN_HOUR = 60 * 60_000;

export type SendState = { code: string | null; why: string | null };

export async function sendACard(_prev: SendState, form: FormData): Promise<SendState> {
  const from = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!spend(`gift:${from}`, ALLOWED, AN_HOUR)) {
    return { code: null, why: "That is a lot of cards at once. Try again in a little while." };
  }

  const checked = checkGift(
    {
      verseRef: form.get("verse"),
      note: form.get("note"),
      from: form.get("from"),
      to: form.get("to"),
    },
    everyVerse().map((v) => ({ reference: v.ref, text: v.text })),
  );

  if (!checked.ok) return { code: null, why: checked.why };

  const code = await keepGift(checked.gift);
  if (!code) return { code: null, why: "The card could not be written down. Try again in a moment." };

  return { code, why: null };
}
