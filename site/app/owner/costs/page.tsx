import { redirect } from "next/navigation";
import { CannotReach, OwnerHeading, OwnerShell } from "@/components/owner/Shell";
import { CostsEditor, type CostFlavor } from "@/components/owner/CostsEditor";
import { OrderReadWarning } from "@/components/owner/Work";
import { isSignedIn } from "@/lib/owner-auth";
import { readShop } from "@/lib/settings";
import { readCosts } from "@/lib/costs-store";
import { ownerOrders } from "@/lib/owner-data";
import { bakeFor } from "@/lib/owner-dashboard";
import { pickupDateLabel } from "@/lib/fulfilment";
import { dollars, rollup, type SoldLine } from "@/lib/costs";
import { baseOfExtra } from "@/lib/extras";
import type { Order } from "@/lib/orders";
import type { Flavor } from "@/lib/content";
export const dynamic = "force-dynamic";

const priceOf = (f: Flavor, size: number) => f.sizePrices?.[size as 3 | 8 | 16] ?? (size === 3 ? f.samplerPrice ?? 5 : f.bagPrice);

export default async function CostsPage() {
  if (!(await isSignedIn())) redirect("/owner/login");
  const [{ shop, live }, { costs, live: costsLive }, { result, warning }] = await Promise.all([readShop(), readCosts(), ownerOrders()]);
  const flavors: CostFlavor[] = shop.flavors.map(f => ({ slug: f.slug, name: f.name, prices: { "3": priceOf(f, 3), "8": priceOf(f, 8), "16": priceOf(f, 16) } }));

  // Sales, bake by bake, at the price each bag actually sold for (before tax).
  const orders: Order[] = result.status === "ok" ? result.orders : [];
  const bakes = new Map<string, Order[]>();
  for (const o of orders) { const k = bakeFor(o); if (/^\d{4}-\d{2}-\d{2}$/.test(k)) bakes.set(k, [...(bakes.get(k) ?? []), o]); }
  const rows = [...bakes.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8).map(([bake, list]) => {
    const sold: SoldLine[] = list.flatMap(o => o.items.flatMap(i => {
      if (!i.slug) return [];
      // A ready-now extra is the same granola as its base flavor, sold at its own price.
      const base = baseOfExtra(i.slug)?.slug ?? i.slug;
      const flavor = shop.flavors.find(f => f.slug === base);
      if (!flavor) return [];
      const size = i.sizeOz ?? (i.format === "sampler" ? 3 : 16);
      const sold = i.priceCents !== undefined ? (i.priceCents - (i.gift ? Math.round(shop.blessingBag.price * 100) : 0)) / 100 : priceOf(flavor, size);
      return [{ slug: base, sizeOz: size, qty: i.qty, priceEach: sold }];
    }));
    return { bake, orders: list.length, ...rollup(costs, sold, list.length) };
  });

  return (
    <OwnerShell active="/owner/costs">
      <OwnerHeading title="Costs & profit" note="Put in what you pay and your recipes. The site works out what each bag costs you, and what you keep." />
      {!live || !costsLive ? <CannotReach what="cost sheet" /> : (
        <>
          <OrderReadWarning result={result} warning={warning} />
          <section className="owner-panel" aria-labelledby="week-title">
            <h2 id="week-title" className="owner-section-title">Profit by bake</h2>
            <p className="owner-muted mt-1">Paid orders at the price each bag sold for, before tax. Needs a recipe for each flavor sold.</p>
            {rows.length === 0 ? <p className="owner-muted mt-3">No paid orders yet.</p> : (
              <div className="mt-3 overflow-x-auto">
                <table className="owner-table">
                  <thead><tr><th>Bake</th><th>Orders</th><th>Sales</th><th>Cost to make</th><th>Card fees</th><th>You keep</th></tr></thead>
                  <tbody>{rows.map(r => (
                    <tr key={r.bake}>
                      <td>{pickupDateLabel(r.bake)}</td><td>{r.orders}</td><td className="tabular-nums">{dollars(r.revenue)}</td>
                      <td className="tabular-nums">{dollars(r.cost)}</td><td className="tabular-nums">{dollars(r.fees)}</td>
                      <td className="tabular-nums font-semibold">{dollars(r.profit)}{r.unknownBags ? <span className="owner-muted font-normal"> · {r.unknownBags} bag{r.unknownBags === 1 ? "" : "s"} have no recipe yet</span> : null}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <CostsEditor initial={costs} flavors={flavors} />
        </>
      )}
    </OwnerShell>
  );
}
