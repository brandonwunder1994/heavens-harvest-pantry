import { describeLine } from "@/lib/cart";
import type { OrderSnapshot } from "@/lib/order-store";

export type SimulatedSnapshot = OrderSnapshot & {
  simulation: { version: 1; taxCents: number; expiresAt: number };
};
export function isSimulatedSnapshot(snapshot: OrderSnapshot): snapshot is SimulatedSnapshot {
  return "simulation" in snapshot && (snapshot as SimulatedSnapshot).simulation?.version === 1;
}
// Deliberately illustrative, never a tax decision or a real payment amount.
export const simulatedTax = (subtotalCents: number) => Math.round(subtotalCents * 2 / 100);
export const simulatedReceiptUrl = (id: string) => `/mockorder/order/thank-you?order_id=${id}`;
export type SimulatedPaymentView = {
  orderId: string; subtotalCents: number; taxCents: number; totalCents: number;
  lines: { description: string; totalCents: number }[];
};
export function simulatedPaymentView(id: string, snapshot: SimulatedSnapshot): SimulatedPaymentView {
  return {
    orderId: id, subtotalCents: snapshot.totals.totalCents,
    taxCents: snapshot.simulation.taxCents,
    totalCents: snapshot.totals.totalCents + snapshot.simulation.taxCents,
    lines: snapshot.totals.lines.map(p => ({ description: describeLine(p), totalCents: p.totalCents })),
  };
}
