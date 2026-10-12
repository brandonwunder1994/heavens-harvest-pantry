import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { OwnerShell, OwnerHeading } from "@/components/owner/Shell";
import guide from "@/lib/founder-guide.json";
import media from "@/lib/founder-guide-images.json";
import Image from "next/image";
export const dynamic = "force-dynamic";
export default async function HelpPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  return <OwnerShell active="/owner/help"><OwnerHeading title="Your pantry guide" note="Choose a topic for short instructions. These steps match the current owner portal." /><a className="stamp w-fit" href="/owner/help/pdf" download>Download printable guide (PDF)</a><nav aria-label="Guide topics" className="flex flex-wrap gap-x-5 gap-y-3">{guide.map(section => <a key={section.id} href={`#${section.id}`} className="owner-link min-h-11 py-2">{section.title}</a>)}</nav>{guide.map(section => <section id={section.id} key={section.id} className="max-w-[820px] scroll-mt-5 border-t border-rule pt-6"><h2 className="owner-section-title">{section.title}</h2><ol className="mt-4 list-decimal space-y-3 pl-6 leading-relaxed">{section.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="mt-4 bg-paper p-4 owner-muted">{section.tip}</p>{section.id in media && <details className="mt-4"><summary className="owner-link cursor-pointer min-h-11 py-2">See sample screen</summary><Image unoptimized width={1100} height={800} className="mt-3 h-auto w-full border border-rule" src={`/owner/help/image/${media[section.id as keyof typeof media]}`} alt={`${section.title}: sample owner screen`}/></details>}</section>)}</OwnerShell>;
}
