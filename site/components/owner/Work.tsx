import Link from "next/link";
import type { OrdersResult } from "@/lib/orders-source";
import type { Order } from "@/lib/orders";
import { formatCentsExact } from "@/lib/orders";
import { bakeFor, itemDescription, pounds, pickupWaiting } from "@/lib/owner-dashboard";
import { pickupDateLabel, storageMessage } from "@/lib/fulfilment";
import { OrderAction } from "@/components/owner/OrderAction";
import { DeliveredToggle } from "@/components/owner/DeliveredToggle";

export function OrderReadWarning({ result, warning }: { result: OrdersResult; warning?: string }) {
  if (!warning && result.status === "ok") return null;
  return <p role="alert" className="owner-alert">{warning || (result.status === "not_configured" ? "Payments are not connected. Sales and orders are unavailable." : "Orders could not load. Refresh before using a bake list or sales total.")}</p>;
}
export function CapacitySummary({ space }: { space: { paidOz: number; heldOz: number; remainingOz: number; capacityOz: number } | null }) {
  return space ? <div className="owner-capacity">{[["Paid", space.paidOz], ["Held in checkout", space.heldOz], ["Remaining", space.remainingOz]].map(([label, oz]) => <div key={label}><span>{label}</span><strong>{pounds(Number(oz))} lb</strong></div>)}</div> : <p className="owner-alert mt-4" role="alert">Capacity could not load. Refresh before accepting or preparing orders.</p>;
}
export function EmailStatus({ order }: { order: Order }) {
  return order.storedId ? <div className="mt-3 text-[12px] owner-muted"><p>Confirmation email: {order.emailStatus ?? "pending"}</p>{order.emailStatus === "error" && <><p className="my-2">{order.emailError || "Email did not send. The order is still paid."}</p><OrderAction orderId={order.storedId} action="email" /></>}</div> : null;
}
export function OrderCard({ order: o, giftsOnly = false, pickupsOnly = false }: { order: Order; giftsOnly?: boolean; pickupsOnly?: boolean }) {
  return <article id={`order-${o.id}`} className="owner-panel">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2>{giftsOnly ? "Blessing delivery" : o.name || "Customer"}</h2><p className="owner-muted mt-1">{pickupDateLabel(giftsOnly ? bakeFor(o) : o.runDate)}{o.pickupPeriod && !giftsOnly ? ` · ${o.pickupPeriod}` : ""}</p></div>{!giftsOnly && <div className="text-right"><p className="font-semibold tabular-nums">{formatCentsExact(o.amountCents)}</p><span className={`owner-badge mt-1 ${o.delivered ? "" : "is-waiting"}`}>{o.delivered ? "Completed" : "Outstanding"}</span></div>}</div>
    {!giftsOnly && <p className="mt-3 break-words">{o.phone}{o.email ? ` · ${o.email}` : ""}</p>}
    <ul className="my-4 divide-y divide-rule">{o.items.map((i, index) => (!giftsOnly || i.gift) && (!pickupsOnly || !i.gift) && <li key={index} className="py-3"><div className="flex flex-wrap justify-between gap-2"><span>{i.qty} × {itemDescription(i)}{i.gift ? ` · gift for ${i.gift.recipientName}` : ""}</span><Link className="owner-link" href={`/owner/labels?order=${encodeURIComponent(o.id)}&item=${index}`}>Print label</Link></div>{i.gift && <div className="mt-2 owner-muted"><p>{i.gift.address}</p>{i.gift.verseRef && <p>Verse: {i.gift.verseRef}</p>}{i.gift.verseNote && <p>Card note: {i.gift.verseNote}</p>}<p className="my-2">Anonymous gift · {(o.giftsDone?.[i.gift.id] ?? o.delivered) ? "Delivered" : "Waiting for delivery"}</p>{o.storedId && <OrderAction orderId={o.storedId} action="gift" giftId={i.gift.id} done={!!o.giftsDone?.[i.gift.id]} />}</div>}</li>)}</ul>
    {!giftsOnly && o.items.some(i => !i.gift) && <><p className="mb-3 owner-muted">{storageMessage(!!o.requiresCooling)} · {pickupWaiting(o) ? "Waiting for pickup" : "Picked up"}</p>{o.storedId ? <OrderAction orderId={o.storedId} action="pickup" done={o.pickupDone} /> : <DeliveredToggle orderId={o.id} delivered={o.delivered} />}</>}
    {!o.storedId && o.items.every(i => !!i.gift) && <DeliveredToggle orderId={o.id} delivered={o.delivered} />}
    {!giftsOnly && o.note && <p className="mt-3">Note: {o.note}</p>}{!giftsOnly && o.prayer && <details className="mt-3"><summary className="owner-link cursor-pointer">Private prayer request</summary><p className="mt-2">{o.prayer}</p></details>}
    {!giftsOnly && <EmailStatus order={o} />}<p className="mt-3 break-all text-[11px] owner-muted">Receipt {o.id}</p>
  </article>;
}
