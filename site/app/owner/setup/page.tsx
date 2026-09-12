import Image from "next/image";
import { redirect } from "next/navigation";
import { completeOwnerSetup, ownerConfigured, setupLinkIsValid, startSession } from "@/lib/owner-auth";
import { business } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function OwnerSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = "", error } = await searchParams;
  const validLink = await setupLinkIsValid(token);
  // A deliberate invite is the controlled handoff from the legacy environment
  // credential to Lauren's own account. Any other visit stays at the login.
  if ((await ownerConfigured()) && !validLink) redirect("/owner/login");

  async function createAccount(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (password !== confirmation) redirect(`/owner/setup?token=${encodeURIComponent(token)}&error=match`);

    const outcome = await completeOwnerSetup({
      token,
      username: String(formData.get("username") ?? ""),
      password,
    });
    if (!outcome.ok) redirect(`/owner/setup?token=${encodeURIComponent(token)}&error=setup`);

    await startSession();
    redirect("/owner");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col items-center justify-center gap-6 px-6 py-16">
      <Image src="/logo.webp" alt="" width={220} height={220} className="h-28 w-28" priority />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="display m-0 text-[40px]">Set up your owner&apos;s page</h1>
        <p className="text-[17px] italic text-sage">{business.name}</p>
      </div>

      {!validLink ? (
        <p role="alert" className="dashed-frame w-full bg-paper px-4 py-3 text-center font-ui text-[13px] leading-relaxed text-bark">
          This setup link is no longer available. Ask Brandon to send you a fresh one.
        </p>
      ) : (
        <>
          <p className="max-w-[34ch] text-center font-ui text-[14px] leading-relaxed text-muted">
            Choose the sign-in details only you will use. This link works once, then closes itself.
          </p>
          {error === "match" ? (
            <p role="alert" className="w-full border border-brown bg-paper px-4 py-3 text-center font-ui text-[13px] font-semibold text-brown">
              Those passwords did not match. Nothing was saved.
            </p>
          ) : null}
          {error === "setup" ? (
            <p role="alert" className="w-full border border-brown bg-paper px-4 py-3 text-center font-ui text-[13px] font-semibold text-brown">
              That link may have expired while you were filling this out. Ask Brandon for a new one.
            </p>
          ) : null}
          <form action={createAccount} className="flex w-full flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-[12px] font-semibold text-muted">Username</span>
              <input name="username" autoComplete="username" required minLength={3} maxLength={64} className="h-12 border border-sand bg-paper px-3.5 font-ui text-[15px] text-ink" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-[12px] font-semibold text-muted">Password</span>
              <input name="password" type="password" autoComplete="new-password" required minLength={12} className="h-12 border border-sand bg-paper px-3.5 font-ui text-[15px] text-ink" />
              <span className="font-ui text-[11px] leading-relaxed text-faint">At least 12 characters. Use something unique to this page.</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-[12px] font-semibold text-muted">Confirm password</span>
              <input name="confirmation" type="password" autoComplete="new-password" required minLength={12} className="h-12 border border-sand bg-paper px-3.5 font-ui text-[15px] text-ink" />
            </label>
            <button type="submit" className="stamp mt-1 !min-h-13">Create owner account</button>
          </form>
        </>
      )}
    </div>
  );
}
