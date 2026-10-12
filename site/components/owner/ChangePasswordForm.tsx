"use client";
import { useActionState } from "react";
import Link from "next/link";
import { changePassword } from "@/app/owner/change-password/actions";
import { Labelled } from "@/components/owner/SaveBar";
import { ownerInputClass } from "@/lib/owner-ui";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, { ok: false, message: "" });
  return (
    <form action={action} className="flex max-w-[480px] flex-col gap-5">
      <Labelled label="Username">
        <input className={ownerInputClass} name="username" autoComplete="username" required maxLength={64} autoCapitalize="none" spellCheck={false} />
      </Labelled>
      <Labelled label="Current password">
        <input className={ownerInputClass} name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} />
      </Labelled>
      <Labelled label="New password" hint="Use at least 12 characters. A few words together can be easier to remember.">
        <input className={ownerInputClass} name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={256} />
      </Labelled>
      <Labelled label="Confirm new password">
        <input className={ownerInputClass} name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={256} />
      </Labelled>
      <p className="owner-muted">After saving, everyone signed in to the owner&apos;s page will need to sign in again. Use your new password.</p>
      <p role="status" aria-live="polite" className="font-semibold text-brown">{state.message}</p>
      <div className="flex flex-wrap items-center gap-5 border-t border-rule pt-5">
        <button type="submit" className="stamp disabled:opacity-60" disabled={pending}>{pending ? "Changing password…" : "Change password"}</button>
        <Link className="owner-link" href="/owner/settings">Cancel</Link>
      </div>
    </form>
  );
}
