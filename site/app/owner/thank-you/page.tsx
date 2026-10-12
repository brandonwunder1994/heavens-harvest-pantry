import Link from "next/link";
import { redirect } from "next/navigation";
import { OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { isSignedIn } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export default async function ThankYouCardsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  return (
    <OwnerShell active="/owner/thank-you">
      <OwnerHeading
        eyebrow="Thank-you cards"
        title="A little thank-you in every order."
        note="Print eight cards on one letter sheet, cut along the dotted lines, and tuck one into each bag."
      />
      <section className="flex max-w-[620px] flex-col gap-5">
        <p className="dashed-frame bg-paper px-5 py-4 font-ui text-[14px] leading-relaxed text-bark">
          Each card thanks the neighbor, invites an honest review, and sends them to the reviews page with a QR code.
        </p>
        <Link href="/owner/thank-you/print" className="stamp w-fit" target="_blank">
          Print eight thank-you cards
        </Link>
      </section>
    </OwnerShell>
  );
}
