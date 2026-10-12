import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { ChangePasswordForm } from "@/components/owner/ChangePasswordForm";
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  return (
    <OwnerShell active="/owner/change-password">
      <OwnerHeading title="Change password" note="Choose a new password for your owner login." />
      <ChangePasswordForm />
    </OwnerShell>
  );
}
