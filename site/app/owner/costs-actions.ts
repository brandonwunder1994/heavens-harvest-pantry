"use server";
import { revalidatePath } from "next/cache";
import { isSignedIn } from "@/lib/owner-auth";
import { cleanCosts } from "@/lib/costs";
import { readCosts, writeCosts } from "@/lib/costs-store";
import { guideSample } from "@/lib/handoff-sample";
import type { SaveState } from "@/lib/save-state";

export async function saveCosts(_previous: SaveState, form: FormData): Promise<SaveState> {
  if (guideSample) return { ok: false, message: "Sample preview only. Changes are not saved." };
  if (!(await isSignedIn())) return { ok: false, message: "Your sign-in expired. Open the page again and nothing will be lost." };
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("value") ?? "")); }
  catch { return { ok: false, message: "Something got garbled on the way. Try saving again." }; }
  // If her saved sheet could not be read, what is on screen may be blank, and saving would erase the real one.
  const { live } = await readCosts();
  if (!live) return { ok: false, message: "Could not reach the place your numbers are kept. Nothing was changed. Try again in a minute." };
  try { await writeCosts(cleanCosts(raw)); }
  catch (error) {
    console.error("[costs] save failed", error);
    return { ok: false, message: "The save did not go through. Nothing was changed." };
  }
  revalidatePath("/owner/costs");
  return { ok: true, message: "Saved." };
}
