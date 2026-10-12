import { redirect } from "next/navigation";
import { CrossWheat } from "@/components/Sprite";
import { business } from "@/lib/content";
import { isSignedIn } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

const CARDS = 4;

/**
 * Four jar tags on one letter sheet. Tall enough for the branded QR, short
 * enough that a browser's default print margins still keep them on one page.
 */
export default async function PrintQrTagsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");

  return (
    <div className="bg-white">
      <p className="print:hidden mx-auto max-w-[7.5in] px-6 py-6 font-ui text-[14px] leading-relaxed text-muted">
        Four tags on one sheet. Print it, then cut along the dotted lines. Use your browser&apos;s print
        button, or Ctrl+P.
      </p>

      <div className="mx-auto grid w-full max-w-[7.5in] grid-cols-2 gap-0 px-0 pb-10 print:pb-0">
        {Array.from({ length: CARDS }, (_, i) => (
          <article
            key={i}
            className="flex h-[4.7in] flex-col items-center justify-center gap-3 overflow-hidden border border-dashed border-[#c9c0ac] px-6 text-center"
            style={{ breakInside: "avoid" }}
          >
            <CrossWheat size={28} color="#6b7a4a" />
            {/* Same branded file the shop and the labels use. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr.svg?v=6" alt="" width={176} height={176} className="h-[176px] w-[176px]" />
            <p className="small-caps m-0 text-[#6b7a4a]">Scan for this week&apos;s granola</p>
            <span className="font-ui text-[8px] font-semibold uppercase tracking-[0.2em] text-[#8a7a62]">
              {business.shortName}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
