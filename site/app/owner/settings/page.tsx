import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { readShop } from "@/lib/settings";
import { privatePickup } from "@/lib/order-store";
import { OwnerHeading, OwnerShell, CannotReach } from "@/components/owner/Shell";
import { PickupEditor } from "@/components/owner/PickupEditor";
import { PorchSwitch } from "@/components/owner/PorchSwitch";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  const { shop, live } = await readShop();
  const pickup = live ? await privatePickup().catch(() => null) : null;
  return <OwnerShell active="/owner/settings"><OwnerHeading title="Settings" note="Pickup details, shop content, and the tools you use less often." />
    <section id="pickup" className="owner-panel scroll-mt-5">{pickup ? <PickupEditor {...pickup} /> : <p role="alert">Your private pickup details could not load. Refresh before editing.</p>}</section>
    <section className="owner-panel"><h2>Storefront message</h2><p className="owner-muted mt-2 mb-5">The porch light changes the message customers see. It does not open or pause checkout. Product availability is managed in Products & prices.</p>{live ? <PorchSwitch porch={shop.porch} /> : <CannotReach what="storefront message" />}</section>
    <section><h2 className="owner-section-title">Content & customers</h2><ul className="mt-3 divide-y divide-rule">{[["/owner/verse", "Weekly verse & site verses", "Change the weekly card or a verse displayed on the site."], ["/owner/reviews", "Customer reviews", "Approve new reviews and manage published reviews."]].map(([href, title, note]) => <li key={href} className="py-4"><Link className="owner-link font-semibold" href={href}>{title}</Link><p className="owner-muted mt-1">{note}</p></li>)}</ul></section>
    <section><h2 className="owner-section-title">Help & secondary tools</h2><ul className="mt-3 divide-y divide-rule">{[["/owner/help", "Pantry guide", "Short instructions for daily tasks, printing, and troubleshooting."], ["/mockorder", "Practice shop & mock orders", "Test the shop separately from real sales, bake capacity, and pickups."], ["/owner/rewards", "Historical reward balances · paused", "Read saved balances. New purchases do not earn points."]].map(([href, title, note]) => <li key={href} className="py-4"><Link className="owner-link font-semibold" href={href}>{title}</Link><p className="owner-muted mt-1">{note}</p></li>)}</ul></section>
    <section className="owner-panel"><h2>Daily routine</h2><ol className="mt-3 list-decimal space-y-2 pl-5"><li>Check Dashboard for sales, capacity, and tasks needing attention.</li><li>Update prices and availability in Products & prices, then save.</li><li>Open Bake & pickup, choose the bake, and prepare only paid items.</li><li>Use Print studio for labels and cards. Mark pickups and gifts complete as you finish them.</li></ol><p className="owner-muted mt-4">Orders close Tuesday at 9 p.m. Arizona time. Friday and Saturday share 48 lb. Scheduling, payments, and tax configuration are managed separately.</p></section>
  </OwnerShell>;
}
