import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSignedIn, ownerConfigured, startSession, verifyCredentials } from "@/lib/owner-auth";
import { clearAttempts, recordFailure, tooManyAttempts } from "@/lib/attempts";
import { business } from "@/lib/content";

export default async function OwnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isSignedIn()) redirect("/owner");
  const { error } = await searchParams;
  const configured = await ownerConfigured();

  async function signIn(formData: FormData) {
    "use server";
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    if (!(await ownerConfigured())) redirect("/owner/login?error=setup");

    // One username, one password: without a brake this is an open invitation
    // to guess it a million times overnight.
    const from = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (tooManyAttempts(from)) redirect("/owner/login?error=slow");

    if (!(await verifyCredentials(username, password))) {
      recordFailure(from);
      redirect("/owner/login?error=wrong");
    }

    clearAttempts(from);
    await startSession();
    redirect("/owner");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col items-center justify-center gap-6 px-6 py-16">
      <Image src="/logo.webp" alt="" width={220} height={220} className="h-28 w-28" />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="display m-0 text-[40px]">Owner&apos;s page</h1>
        <p className="text-[17px] italic text-sage">{business.name}</p>
      </div>

      {error === "slow" ? (
        <p role="alert" className="w-full border border-brown bg-paper px-4 py-3 text-center font-ui text-[13px] font-semibold text-brown">
          Too many tries. Wait a quarter of an hour and try again.
        </p>
      ) : null}

      {error === "wrong" ? (
        <p role="alert" className="w-full border border-brown bg-paper px-4 py-3 text-center font-ui text-[13px] font-semibold text-brown">
          That username and password did not match. Try again.
        </p>
      ) : null}

      {!configured ? (
        <p role="alert" className="dashed-frame w-full bg-paper px-4 py-3 text-center font-ui text-[13px] leading-relaxed text-bark">
          No sign-in has been set up on this deployment yet, so nobody can get in. Add the owner
          username, password hash and session secret in the hosting settings.
        </p>
      ) : null}

      <form action={signIn} className="flex w-full flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-[12px] font-semibold text-muted">Username</span>
          <input
            name="username"
            autoComplete="username"
            required
            className="h-12 border border-sand bg-paper px-3.5 font-ui text-[15px] text-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-[12px] font-semibold text-muted">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-12 border border-sand bg-paper px-3.5 font-ui text-[15px] text-ink"
          />
        </label>
        <button type="submit" className="stamp mt-1 !min-h-13">
          Sign in
        </button>
      </form>

      <p className="text-center font-ui text-[11px] leading-relaxed text-faint">
        This page is only for the pantry. Customers never see it, and it is kept out of search results.
      </p>
    </div>
  );
}
