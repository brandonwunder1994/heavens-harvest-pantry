"use server";

import { revalidatePath } from "next/cache";
import { isSignedIn } from "@/lib/owner-auth";
import { archiveVerse, clearWeeklyVerse, isEditableKey, readShop, saveSetting } from "@/lib/settings";
import { approve, remove } from "@/lib/reviews-source";
import type { SaveState } from "@/lib/save-state";

/**
 * Everything the owner can change about the shop goes through here. Each one
 * checks she is still signed in first: a stale tab is not a way in.
 *
 * The rule these all follow: never report success for something that did not
 * happen. She cannot read a log, and there is no undo, so a save that was
 * refused or that could not reach the database has to say so in her own words.
 */

/** Refresh every customer-facing page so her change is visible immediately. */
function refreshTheShop() {
  revalidatePath("/", "layout");
}

export async function saveBlock(_previous: SaveState, formData: FormData): Promise<SaveState> {
  if (!(await isSignedIn())) {
    return { ok: false, message: "Your sign-in expired. Open the page again and nothing will be lost." };
  }

  const key = String(formData.get("key") ?? "");
  if (!isEditableKey(key)) {
    return { ok: false, message: "That is not something this page can change." };
  }

  let value: unknown;
  try {
    value = JSON.parse(String(formData.get("value") ?? ""));
  } catch {
    return { ok: false, message: "Something got garbled on the way. Try saving again." };
  }

  // If her settings could not be read, the boxes on screen are the built-in
  // samples rather than hers, and saving them would write over her real ones.
  const { live, shop } = await readShop();
  if (!live) {
    return {
      ok: false,
      message:
        "Could not reach the place your settings are kept, so what is on screen may not be yours. Nothing was changed. Try again in a minute.",
    };
  }

  // The verse card carries one instruction that is not part of the verse.
  const wantsArchive = key === "verseOfTheWeek" ? (value as { archive?: boolean })?.archive !== false : false;
  if (key === "verseOfTheWeek" && value && typeof value === "object") {
    delete (value as { archive?: boolean }).archive;
  }

  try {
    const outcome = await saveSetting(key, value);
    if (!outcome.ok) return { ok: false, message: outcome.problem };

    // Only once the new verse is really saved does the old one go on the public
    // wall. Filing it first meant a refused save still changed something, and
    // there is no way to take a verse off that wall again.
    if (key === "verseOfTheWeek" && wantsArchive) {
      const replaced = shop.verseOfTheWeek;
      const changed = replaced.text && replaced.text !== (value as { text?: string })?.text;
      if (changed) await archiveVerse(replaced);
    }
  } catch (error) {
    console.error("[owner] save failed", error);
    return { ok: false, message: "The save did not go through. Nothing was changed." };
  }

  refreshTheShop();
  if (key === "labelTemplates") {
    return { ok: true, message: "Saved. This flavor's label is ready to print." };
  }
  return { ok: true, message: "Saved. It is live on the site now." };
}

/**
 * Hands this week's verse back to the calendar. Her override is deleted, so from
 * here on the week's verse is worked out from the date again and she has nothing
 * to remember on a Monday.
 */
export async function handBackToCalendar(): Promise<SaveState> {
  if (!(await isSignedIn())) return { ok: false, message: "Your sign-in expired." };

  try {
    await clearWeeklyVerse();
  } catch (error) {
    console.error("[owner] could not hand the verse back", error);
    return { ok: false, message: "That did not go through. Nothing was changed." };
  }

  refreshTheShop();
  revalidatePath("/owner/verse");
  return { ok: true, message: "Back on the calendar. It changes on its own every Monday." };
}

export async function approveReview(_previous: SaveState, formData: FormData): Promise<SaveState> {
  if (!(await isSignedIn())) return { ok: false, message: "Your sign-in expired." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { ok: false, message: "That review no longer exists." };

  try {
    await approve(id);
  } catch (error) {
    console.error("[owner] approve failed", error);
    return { ok: false, message: "It did not go through. Try again." };
  }

  refreshTheShop();
  revalidatePath("/owner/reviews");
  return { ok: true, message: "Published." };
}

export async function deleteReview(_previous: SaveState, formData: FormData): Promise<SaveState> {
  if (!(await isSignedIn())) return { ok: false, message: "Your sign-in expired." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { ok: false, message: "That review no longer exists." };

  try {
    await remove(id);
  } catch (error) {
    console.error("[owner] delete failed", error);
    return { ok: false, message: "It did not go through. Try again." };
  }

  refreshTheShop();
  revalidatePath("/owner/reviews");
  return { ok: true, message: "Deleted." };
}
