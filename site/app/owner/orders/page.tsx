import Link from "next/link";
import { OrderTabs } from "@/components/owner/OrderTabs";
import { OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { OrderCard, OrderReadWarning } from "@/components/owner/Work";
import { ownerOrders } from "@/lib/owner-data";
import { filterOrders, bakeFor } from "@/lib/owner-dashboard";
import { pickupDateLabel } from "@/lib/fulfilment";
import { ownerInputClass as inputClass } from "@/lib/owner-ui";
export const dynamic = "force-dynamic";
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; bake?: string; status?: string; page?: string; issue?: string }> }) {
  const params = await searchParams;
  const status = ["all", "completed"].includes(params.status ?? "") ? params.status! : "outstanding";
  const { result, warning } = await ownerOrders();
  const all = result.status === "ok" ? result.orders : [];
  const matching = params.issue === "email" ? all.filter(o => o.emailStatus === "error") : all;
  const filtered = filterOrders(matching, { ...params, status, page: Number(params.page) });
  const dates = [...new Set(all.map(bakeFor).filter(Boolean))].sort().reverse();
  const pageHref = (page: number) => `/owner/orders?${new URLSearchParams({ q: params.q ?? "", bake: params.bake ?? "", status, page: String(page), ...(params.issue === "email" ? { issue: "email" } : {}) })}`;
  return <OwnerShell active="/owner/orders"><OwnerHeading title="Orders" note="Find a paid order, finish a pickup or gift delivery, and revisit completed orders." /><OrderReadWarning result={result} warning={warning} />
    <OrderTabs/>
    <form className="grid items-end gap-4 sm:grid-cols-[2fr_1.2fr_1fr_auto]" action="/owner/orders"><label>Search<input className={`${inputClass} mt-1`} name="q" defaultValue={params.q} placeholder="Name, phone, email or receipt" /></label><label>Bake<select className={`${inputClass} mt-1`} name="bake" defaultValue={params.bake ?? ""}><option value="">All bakes</option>{dates.map(d => <option key={d} value={d}>{pickupDateLabel(d)}</option>)}</select></label><label>Status<select className={`${inputClass} mt-1`} name="status" defaultValue={status}><option value="outstanding">Outstanding</option><option value="completed">Completed</option><option value="all">All paid orders</option></select></label>{params.issue === "email" && <input type="hidden" name="issue" value="email" />}<button className="stamp">Find orders</button></form>
    {params.issue === "email" && <p className="owner-alert">Showing failed confirmations. <Link className="owner-link" href="/owner/orders?status=all">Clear this filter</Link></p>}
    {result.status === "ok" && <p className="owner-muted">{filtered.total} matching order{filtered.total === 1 ? "" : "s"} · page {filtered.page} of {filtered.pages}</p>}
    {filtered.orders.map(o => <OrderCard key={o.id} order={o} />)}
    {result.status === "ok" && !filtered.total && <p className="owner-empty">No orders match these filters. Try all paid orders or clear your search.</p>}
    {filtered.pages > 1 && <nav aria-label="Order pages" className="flex justify-between gap-4">{filtered.page > 1 ? <Link className="stamp stamp-light" href={pageHref(filtered.page - 1)}>Previous</Link> : <span />}{filtered.page < filtered.pages && <Link className="stamp stamp-light" href={pageHref(filtered.page + 1)}>Next</Link>}</nav>}
  </OwnerShell>;
}
