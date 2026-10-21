"use server";
import { revalidatePath } from "next/cache";
import { isSignedIn } from "@/lib/owner-auth";
import { checkGiveawaySetting, roundKey } from "@/lib/giveaway";
import { sendVerified, sendWinner } from "@/lib/giveaway-mail";
import { clearWinner, currentWinner, getEntry, markVerified, pickWinner, readGiveaway, removeEntry, writeGiveaway } from "@/lib/giveaway-store";
import { mailReady } from "@/lib/mailer";
import type { SaveState } from "@/lib/save-state";

const expired: SaveState = { ok: false, message: "Your sign-in expired. Open the page again and nothing will be lost." };
const unreachable: SaveState = { ok: false, message: "Could not reach the place your settings are kept. Nothing was changed. Try again in a minute." };

const refresh = () => {
  revalidatePath("/owner/giveaway");
  revalidatePath("/monthly-giveaway");
};

export async function saveGiveaway(_previous: SaveState, form: FormData): Promise<SaveState> {
  if (!(await isSignedIn())) return expired;
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("value") ?? "")); }
  catch { return { ok: false, message: "Something got garbled on the way. Try saving again." }; }

  const checked = checkGiveawaySetting(raw);
  if (!checked.ok) return { ok: false, message: checked.problem };

  const before = await readGiveaway();
  if (!before.live) return unreachable;

  try { await writeGiveaway(checked.setting); }
  catch (error) {
    console.error("[giveaway] save failed", error);
    return { ok: false, message: "The save did not go through. Nothing was changed." };
  }
  refresh();
  return {
    ok: true,
    message: checked.setting.open ? "Saved. The giveaway is open on the website." : "Saved. The giveaway is closed on the website.",
  };
}

const entryId = (form: FormData): number | null => {
  const id = Number(form.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** Marks them verified and sends the "you're in" email with the draw date. */
export async function verifyEntry(_previous: SaveState, form: FormData): Promise<SaveState> {
  if (!(await isSignedIn())) return expired;
  const id = entryId(form);
  if (!id) return { ok: false, message: "That entry no longer exists." };

  const { setting, live } = await readGiveaway();
  if (!live) return unreachable;

  try {
    const entry = await getEntry(id);
    if (!entry) return { ok: false, message: "That entry no longer exists." };
    const changed = await markVerified(id);
    refresh();
    if (!changed) return { ok: true, message: "Already verified." };
    if (!mailReady) return { ok: true, message: "Verified. Email is not switched on, so no confirmation was sent." };
    const sent = await sendVerified(entry, setting, roundKey(setting));
    return sent.ok
      ? { ok: true, message: "Verified. Their confirmation email is on its way." }
      : { ok: true, message: "Verified, but the confirmation email did not send. You can write to them yourself." };
  } catch (error) {
    console.error("[giveaway] verify failed", error);
    return { ok: false, message: "It did not go through. Try again." };
  }
}

export async function deleteEntry(_previous: SaveState, form: FormData): Promise<SaveState> {
  if (!(await isSignedIn())) return expired;
  const id = entryId(form);
  if (!id) return { ok: false, message: "That entry no longer exists." };
  try { await removeEntry(id); }
  catch (error) {
    console.error("[giveaway] delete failed", error);
    return { ok: false, message: "It did not go through. Try again." };
  }
  refresh();
  return { ok: true, message: "Deleted." };
}

export type SpinResult = { ok: true; id: number; label: string } | { ok: false; message: string };

/**
 * The draw. The winner is chosen here by the server, never in the browser, and
 * only when she is signed in and the names are showing — the wheel on screen
 * then lands on whoever this returns.
 */
export async function spinWheel(): Promise<SpinResult> {
  if (!(await isSignedIn())) return { ok: false, message: "Sign in as the owner to spin." };
  const { setting, live } = await readGiveaway();
  if (!live) return { ok: false, message: "Could not reach the giveaway. Try again in a minute." };
  if (!setting.revealed) return { ok: false, message: "Turn on \"Show names on the wheel\" first." };
  try {
    const winner = await pickWinner(roundKey(setting));
    if (!winner) return { ok: false, message: "There are no verified entries to draw from." };
    refresh();
    return { ok: true, id: winner.id, label: winner.name };
  } catch (error) {
    console.error("[giveaway] spin failed", error);
    return { ok: false, message: "The draw did not go through. Try again." };
  }
}

export async function resetWinner(): Promise<SaveState> {
  if (!(await isSignedIn())) return expired;
  const { setting, live } = await readGiveaway();
  if (!live) return unreachable;
  try { await clearWinner(roundKey(setting)); }
  catch { return { ok: false, message: "It did not go through. Try again." }; }
  refresh();
  return { ok: true, message: "Winner cleared. You can spin again." };
}

export async function emailWinner(): Promise<SaveState> {
  if (!(await isSignedIn())) return expired;
  const { setting, live } = await readGiveaway();
  if (!live) return unreachable;
  if (!mailReady) return { ok: false, message: "Email is not switched on yet, so nothing was sent." };
  try {
    const round = roundKey(setting);
    const winner = await currentWinner(round);
    if (!winner) return { ok: false, message: "There is no winner picked yet." };
    const sent = await sendWinner(winner, setting, round);
    return sent.ok
      ? { ok: true, message: `Sent to ${winner.email}.` }
      : { ok: false, message: "The email did not send. You can write to them yourself." };
  } catch (error) {
    console.error("[giveaway] winner email failed", error);
    return { ok: false, message: "It did not go through. Try again." };
  }
}
