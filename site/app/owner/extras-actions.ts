"use server";
import { revalidatePath } from "next/cache";
import { isSignedIn } from "@/lib/owner-auth";
import { cleanExtras, extraSlug, weekendFor } from "@/lib/extras";
import { readExtrasSetting, writeExtrasSetting } from "@/lib/extras-store";
import { readShop } from "@/lib/settings";
import { guideSample } from "@/lib/handoff-sample";
import type { SaveState } from "@/lib/save-state";

/**
 * Saves this weekend's extras. The weekend and the "counted since" time are
 * worked out here, never taken from the browser, so a stale tab cannot reset
 * the count and let the same bag sell twice.
 */
export async function saveExtras(_previous: SaveState, form: FormData): Promise<SaveState> {
  if (guideSample) return { ok: false, message: "Sample preview only. Changes are not saved." };
  if (!(await isSignedIn())) return { ok: false, message: "Your sign-in expired. Open the page again and nothing will be lost." };
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("value") ?? "")); }
  catch { return { ok: false, message: "Something got garbled on the way. Try saving again." }; }

  const { shop, live } = await readShop();
  const previous = await readExtrasSetting();
  if (!live || !previous.live) return { ok: false, message: "Could not reach the place your settings are kept. Nothing was changed. Try again in a minute." };

  const now = Date.now();
  const weekend = weekendFor(now);
  const cleaned = cleanExtras(raw, now);
  const known = new Set(shop.flavors.map(f => f.slug));
  const sameWeekend = previous.setting.weekend === weekend;
  const stamp = new Date(now).toISOString();
  const items = cleaned.items
    .filter(i => known.has(i.slug))
    .map(i => {
      const before = sameWeekend ? previous.setting.items.find(p => extraSlug(p.slug, p.sizeOz) === extraSlug(i.slug, i.sizeOz)) : undefined;
      return { ...i, setAt: before?.setAt ?? stamp };
    });

  try { await writeExtrasSetting({ open: cleaned.open, weekend, note: cleaned.note, items }); }
  catch (error) {
    console.error("[extras] save failed", error);
    return { ok: false, message: "The save did not go through. Nothing was changed." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: cleaned.open ? "Saved. Your extras are live on the site." : "Saved. Extras are hidden from the site." };
}
