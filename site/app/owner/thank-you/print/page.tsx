import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { business } from "@/lib/content";
import { isSignedIn } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

const CARDS = 8;
const REVIEW_URL = "https://heavensharvestpantry.com/reviews?src=thank-you-card";

export default async function PrintThankYouCardsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  const qr = await QRCode.toDataURL(REVIEW_URL, { margin: 1, width: 180, color: { dark: "#5b3d1e", light: "#ffffff" } });

  return (
    <div className="bg-white">
      <p className="print:hidden mx-auto max-w-[7.5in] px-6 py-6 font-ui text-[14px] leading-relaxed text-muted">
        Eight cards on one letter sheet. Print at 100%, then cut along the dotted lines.
      </p>
      <div className="mx-auto grid w-full max-w-[7.5in] grid-cols-2 gap-0 print:pb-0">
        {Array.from({ length: CARDS }, (_, i) => (
          <article key={i} className="flex h-[2.5in] flex-col items-center justify-between overflow-hidden border border-dashed border-[#c9c0ac] px-5 py-4 text-center" style={{ breakInside: "avoid" }}>
            <div className="small-caps text-[#6b7a4a]">{business.shortName}</div>
            <h1 className="display m-0 text-[23px] leading-none text-[#3a2712]">Thank you for your order.</h1>
            <p className="m-0 max-w-[16em] text-[14px] italic leading-snug text-[#5b3d1e]">Our small business thrives off honest referrals.</p>
            <p className="m-0 font-ui text-[10px] leading-snug text-[#6b5a42]">If you enjoyed your granola, we&apos;d be grateful if you shared an honest review.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Scan to leave a review" width={72} height={72} className="h-[72px] w-[72px]" />
            <div className="font-ui text-[8px] font-semibold uppercase tracking-[0.16em] text-[#8a7a62]">Scan to leave a review</div>
          </article>
        ))}
      </div>
    </div>
  );
}
