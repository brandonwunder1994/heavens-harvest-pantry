import { redirect } from "next/navigation";
import { CrossWheat, HeartSeal } from "@/components/Sprite";
import { business } from "@/lib/content";
import { isSignedIn } from "@/lib/owner-auth";
import { readShop } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Eight cards on one sheet of letter paper.
 *
 * Four rows at 2.5in is 10in, which clears the 10.2in a browser leaves inside
 * its default margins; at 2.6in the last row was pushed onto a second page.
 *
 * This page reads her verse strictly. Everywhere else a database that cannot be
 * reached falls back to the built-in sample, which is harmless on a screen and
 * not harmless here: she would print eight cards of a verse she never chose and
 * put one in every order that week.
 */
const CARDS = 8;

export default async function PrintCardsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  const { shop, live } = await readShop();

  if (!live) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-[7in] border-2 border-brown bg-[#fdf6ea] px-6 py-6 font-ui text-[15px] leading-relaxed text-brown"
      >
        <strong className="font-semibold">Do not print this yet.</strong> This week&apos;s verse could
        not be read just now, so these cards would carry the wrong words. Give it a minute and reload
        the page.
      </p>
    );
  }

  const { verseOfTheWeek } = shop;

  return (
    <div className="bg-white">
      <p className="print:hidden mx-auto max-w-[7.5in] px-6 py-6 font-ui text-[14px] leading-relaxed text-muted">
        Eight cards on one sheet. Print it, then cut along the dotted lines. Plain paper is fine;
        cardstock holds up better in a jar. Use your browser&apos;s print button, or Ctrl+P.
      </p>

      <div className="mx-auto grid w-full max-w-[7.5in] grid-cols-2 gap-0 px-0 pb-10 print:pb-0">
        {Array.from({ length: CARDS }, (_, i) => (
          <article
            key={i}
            className="flex h-[2.5in] flex-col items-center justify-center gap-2 overflow-hidden border border-dashed border-[#c9c0ac] px-6 text-center"
            style={{ breakInside: "avoid" }}
          >
            <CrossWheat size={24} color="#6b7a4a" />
            <p className="verse m-0 text-[16px] leading-snug" style={{ color: "#3a2712" }}>
              &ldquo;{verseOfTheWeek.text}&rdquo;
            </p>
            {verseOfTheWeek.reference ? (
              <div className="ref !text-[9px]" style={{ color: "#6b7a4a" }}>
                {verseOfTheWeek.reference}
              </div>
            ) : null}
            <div className="mt-1 flex items-center gap-1.5">
              <HeartSeal size={13} />
              <span className="font-ui text-[8px] font-semibold uppercase tracking-[0.2em] text-[#8a7a62]">
                {business.shortName}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
