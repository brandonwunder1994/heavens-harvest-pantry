import Link from "next/link";
import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { PageVersesEditor, WeeklyVerseEditor } from "@/components/owner/VerseEditor";
import { isSignedIn } from "@/lib/owner-auth";
import { readShop } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function VerseAdminPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const { shop, live } = await readShop();

  return (
    <OwnerShell active="/owner/verse">
      <OwnerHeading
        eyebrow="Verse card"
        title="This week's verse."
        note="It goes on the card in every order, at the top of the menu, and across the front page. Change it whenever you like; it is live the moment you save."
      />

      {!live ? (
        <CannotReach what="verse" />
      ) : (
        <>
          <WeeklyVerseEditor verse={shop.verseOfTheWeek} />

          <Link href="/owner/verse/print" className="stamp stamp-light w-fit" target="_blank">
            Print this week&apos;s cards
          </Link>

          <section className="mt-6 flex flex-col gap-5">
            <h2 className="display m-0 text-[26px]">The verses on the rest of the site</h2>
            <p className="max-w-[62ch] font-ui text-[14px] leading-relaxed text-muted">
              These sit in fixed places and rarely change. Each one says where it appears.
            </p>
            <PageVersesEditor verses={shop.verses} />
          </section>
        </>
      )}
    </OwnerShell>
  );
}
