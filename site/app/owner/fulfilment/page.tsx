import Link from "next/link";
import { OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { CapacitySummary, OrderCard, OrderReadWarning } from "@/components/owner/Work";
import { ownerOrders } from "@/lib/owner-data";
import { capacity } from "@/lib/order-store";
import { pickupDate, pickupDateLabel, saturdayDate } from "@/lib/fulfilment";
import { bakeFor, itemDescription, itemOz, pounds } from "@/lib/owner-dashboard";
import { ownerInputClass as inputClass } from "@/lib/owner-ui";
export const dynamic = "force-dynamic";
export default async function FulfilmentPage({ searchParams }: { searchParams: Promise<{ bake?: string; view?: string }> }) {
  const params = await searchParams;
  const { result, warning } = await ownerOrders();
  const orders = result.status === "ok" ? result.orders : [];
  const upcoming = pickupDate();
  const dates = [...new Set([upcoming, ...orders.map(bakeFor).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))])].sort().reverse();
  const bake = params.bake && dates.includes(params.bake) ? params.bake : upcoming;
  const view = ["pickups", "gifts"].includes(params.view ?? "") ? params.view! : "bake";
  const batch = orders.filter(o => bakeFor(o) === bake || (!o.bakeId && o.runDate === saturdayDate(bake)));
  const space = await capacity(bake).catch(() => null);
  const grouped = new Map<string, { qty: number; oz: number }>();
  for (const o of batch) for (const i of o.items) { const label = itemDescription(i); const row = grouped.get(label) ?? { qty: 0, oz: 0 }; row.qty += i.qty; row.oz += itemOz(i); grouped.set(label, row); }
  return <OwnerShell active="/owner/fulfilment"><OwnerHeading title="Bake & pickup" note="Prepare paid orders by purchased size and recipe. Friday and Saturday share one 48 lb bake." /><OrderReadWarning result={result} warning={warning} />
    <form action="/owner/fulfilment" className="flex flex-wrap items-end gap-3"><label>Bake for Friday<select className={`${inputClass} mt-1`} name="bake" defaultValue={bake}>{dates.map(d => <option key={d} value={d}>{pickupDateLabel(d)}{orders.some(o => bakeFor(o) === d && !o.delivered) ? " · unfinished orders" : ""}</option>)}</select></label><input type="hidden" name="view" value={view} /><button className="stamp stamp-light">View bake</button><Link className="owner-link ml-auto" href="/owner/print">Print studio</Link></form>
    <section className="owner-panel"><h2>{pickupDateLabel(bake)}</h2><CapacitySummary space={space} /></section>
    <nav className="owner-tabs" aria-label="Fulfillment view">{[["bake", "Bake list"], ["pickups", "Pickups"], ["gifts", "Blessing gifts"]].map(([key, label]) => <Link key={key} aria-current={view === key ? "page" : undefined} href={`/owner/fulfilment?bake=${bake}&view=${key}`}>{label}</Link>)}</nav>
    {result.status === "ok" && view === "bake" && <section><h2 className="owner-section-title">Combined production list</h2><p className="owner-muted mt-1">Includes paid pickup orders and gifts, including those already completed.</p>{grouped.size ? <table className="owner-table mt-3"><thead><tr><th>Product & recipe</th><th>Units</th><th>Weight</th></tr></thead><tbody>{[...grouped].map(([label, row]) => <tr key={label}><td>{label}</td><td>{row.qty}</td><td className="whitespace-nowrap tabular-nums">{pounds(row.oz)} lb</td></tr>)}</tbody></table> : <p className="owner-empty">No paid items for this bake yet. Checkout holds stay out of the production list.</p>}</section>}
    {result.status === "ok" && view === "pickups" && [bake, saturdayDate(bake)].flatMap((date, day) => ["morning", "afternoon"].map(period => {
      const group = batch.filter(o => o.runDate === date && (o.pickupPeriod ?? "morning") === period && o.items.some(i => !i.gift));
      const items = group.flatMap(o => o.items.filter(i => !i.gift));
      const chocolate = items.filter(i => i.requiresCooling);
      return <section key={`${date}-${period}`} className="flex flex-col gap-4"><div><h2 className="owner-section-title">{day ? "Saturday" : "Friday"} {period}{period === "afternoon" ? " · from noon" : ""}</h2><p className="owner-muted mt-1">{pounds(items.reduce((n, i) => n + itemOz(i), 0))} lb · {chocolate.reduce((n, i) => n + i.qty, 0)} refrigerated units / {pounds(chocolate.reduce((n, i) => n + itemOz(i), 0))} lb</p></div>{group.length ? group.map(o => <OrderCard key={o.id} order={o} pickupsOnly />) : <p className="owner-muted">No pickups in this group.</p>}</section>;
    }))}
    {result.status === "ok" && view === "gifts" && <section className="flex flex-col gap-4"><h2 className="owner-section-title">Friday blessing deliveries</h2><p className="owner-muted">Keep gifts anonymous. Labels and cards use the recipient’s name.</p>{batch.filter(o => o.items.some(i => i.gift)).map(o => <OrderCard key={o.id} order={o} giftsOnly />)}{!batch.some(o => o.items.some(i => i.gift)) && <p className="owner-empty">No blessing deliveries for this bake yet.</p>}</section>}
  </OwnerShell>;
}
