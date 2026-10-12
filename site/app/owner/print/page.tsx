import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { OwnerHeading, OwnerShell } from "@/components/owner/Shell";
export const dynamic = "force-dynamic";
const tools = [
  ["/owner/labels", "Product labels", "Choose a purchased order item, or prepare a label for a product. Download the existing 640 × 384 px PNG for the T50M Pro.", "Open label editor"],
  ["/owner/verse/print", "Weekly verse cards", "Eight cards on a letter sheet. Uses the current saved weekly verse.", "Print verse cards"],
  ["/owner/thank-you/print", "Thank-you cards", "Eight cards on a letter sheet, with a QR link for an honest review.", "Print thank-you cards"],
  ["/owner/qr", "Menu QR & tags", "Download the color or thermal QR, or print four tags per letter sheet.", "Open QR tools"],
];
export default async function PrintPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  return <OwnerShell active="/owner/print"><OwnerHeading title="Print studio" note="Everything for packing an order, in one place. Check one printed piece before printing a whole batch." /><div className="divide-y divide-rule">{tools.map(([href, title, note, action]) => <section key={href} className="flex flex-wrap items-start justify-between gap-5 py-6"><div className="max-w-[620px]"><h2 className="owner-section-title">{title}</h2><p className="owner-muted mt-2">{note}</p>{href.includes("verse") && <Link className="owner-link mt-3 inline-block" href="/owner/verse">Change the weekly verse</Link>}</div><Link className="stamp stamp-light" target={href.endsWith("/print") ? "_blank" : undefined} href={href}>{action}</Link></section>)}</div></OwnerShell>;
}
