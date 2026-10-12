import Link from "next/link";
import { OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { CapacitySummary, OrderReadWarning } from "@/components/owner/Work";
import { ownerOrders } from "@/lib/owner-data";
import { capacity, privatePickup } from "@/lib/order-store";
import { pickupDate, pickupDateLabel } from "@/lib/fulfilment";
import { dashboardSummary, bakeFor } from "@/lib/owner-dashboard";
import { formatCentsExact } from "@/lib/orders";
import { pendingReviewCount } from "@/lib/reviews-source";
import { guideSample } from "@/lib/handoff-sample";

export const dynamic = "force-dynamic";
export default async function OwnerPage() {
  const { result, warning } = await ownerOrders();
  const bake = pickupDate();
  const [space, pickup, reviews] = await Promise.all([capacity(bake).catch(() => null), privatePickup().catch(() => null), pendingReviewCount()]);
  const orders = result.status === "ok" ? result.orders : null;
  const totals = orders ? dashboardSummary(orders) : null;
  const failed = orders?.filter(o => o.emailStatus === "error") ?? [];
  const older = orders?.filter(o => !o.delivered && bakeFor(o) < bake) ?? [];
  const attention = [
    ...(failed.length ? [{ href: "/owner/orders?status=all&issue=email", text: `${failed.length} confirmation emails need attention` }] : []),
    ...(reviews ? [{ href: "/owner/reviews", text: `${reviews} reviews waiting for approval` }] : []),
    ...(pickup && !pickup.address ? [{ href: "/owner/settings#pickup", text: "Add your private pickup address before accepting pickups" }] : []),
    ...(older.length ? [{ href: "/owner/orders?status=outstanding", text: `${older.length} unfinished orders from an earlier bake` }] : []),
  ];
  return <OwnerShell active="/owner">
    <OwnerHeading title="Your pantry at a glance" note="A quick look at business activity and what needs your attention." />
    {guideSample && <p className="owner-alert" role="status">Preview with sample data. These are not real sales or orders. Saving is disabled.</p>}
    <OrderReadWarning result={result} warning={warning} />
    <section aria-labelledby="activity-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="activity-title" className="owner-section-title">Last 7 days</h2><p className="owner-muted text-[12px]">Today and the previous 6 days · Arizona time</p></div>
      <dl className="owner-statline mt-4">
        <div><dt>Paid order total · including tax</dt><dd>{totals ? formatCentsExact(totals.cents) : "Unavailable"}</dd><small>{totals ? `${formatCentsExact(totals.previousCents)} in the previous 7 days` : "Refresh to read your payments"}</small></div>
        <div><dt>Paid orders</dt><dd>{totals?.count ?? "Unavailable"}</dd><small>{totals ? `${totals.previousCount} in the previous 7 days` : "Payment data could not load"}</small></div>
        <div><dt>Waiting for pickup</dt><dd>{totals?.pickups ?? "Unavailable"}</dd><small>Outstanding orders · all bakes</small></div>
        <div><dt>Gifts to deliver</dt><dd>{totals?.gifts ?? "Unavailable"}</dd><small>Outstanding gift units · all bakes</small></div>
      </dl>
    </section>
    <div className="owner-workgrid">
      <section className="owner-panel"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2>Upcoming bake</h2><p className="owner-muted mt-1">{pickupDateLabel(bake)}</p></div><Link className="owner-link" href="/owner/fulfilment">Open bake & pickup</Link></div><CapacitySummary space={space} /><p className="owner-muted mt-5 text-[12px]">Friday and Saturday share one 48 lb bake. Checkout holds are not paid orders.</p></section>
      <section className="owner-panel"><h2>Needs attention</h2>{attention.length ? <ul className="mt-3 divide-y divide-rule">{attention.map(a => <li key={a.href} className="py-3"><Link className="owner-link" href={a.href}>{a.text}</Link></li>)}</ul> : orders && pickup && reviews !== null ? <p className="owner-empty">You’re caught up. New tasks will appear here.</p> : <p className="owner-empty">Some checks could not load. Refresh to check again.</p>}{(!pickup || reviews === null) && <p role="status" className="owner-muted mt-2">{!pickup ? "Pickup settings could not load. " : ""}{reviews === null ? "Review count could not load." : ""}</p>}</section>
    </div>
    <section><div className="flex items-baseline justify-between gap-4"><h2 className="owner-section-title">Recent paid orders</h2><Link href="/owner/orders?status=all" className="owner-link">View all orders</Link></div>
      {orders?.length ? <table className="owner-table owner-responsive-table mt-3"><thead><tr><th>Order</th><th>Pickup / bake</th><th>Total incl. tax</th><th>Status</th></tr></thead><tbody>{orders.slice(0, 5).map(o => <tr key={o.id}><td><Link className="owner-link font-semibold" href={`/owner/orders?status=all&q=${encodeURIComponent(o.id)}`}>{o.name || "Customer"}</Link></td><td>{pickupDateLabel(o.runDate || bakeFor(o))}</td><td className="tabular-nums">{formatCentsExact(o.amountCents)}</td><td><span className={`owner-badge ${o.delivered ? "" : "is-waiting"}`}>{o.delivered ? "Completed" : "Outstanding"}</span></td></tr>)}</tbody></table> : <p className="owner-empty">{orders ? "Your first paid order will appear here. Products and print tools are ready in the menu." : "Recent orders could not load. Refresh to try again."}</p>}
    </section>
  </OwnerShell>;
}
