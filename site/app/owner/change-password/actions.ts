"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { changeOwnerPassword, endSession, isSignedIn } from "@/lib/owner-auth";
import { clearAttempts, recordFailure, tooManyAttempts } from "@/lib/attempts";
import type { SaveState } from "@/lib/save-state";

export async function changePassword(_previous: SaveState, formData: FormData): Promise<SaveState> {
  if (!(await isSignedIn())) return { ok: false, message: "Your sign-in expired. Sign in again before changing your password." };
  const address = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `password-change:${address}`;
  if (tooManyAttempts(key)) return { ok: false, message: "Too many tries. Wait 15 minutes and try again." };
  const result = await changeOwnerPassword({
    username: String(formData.get("username") ?? ""),
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!result.ok) {
    recordFailure(key);
    return result;
  }
  clearAttempts(key);
  await endSession();
  redirect("/owner/login?password=changed");
}
