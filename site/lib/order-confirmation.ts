import type { OrderSnapshot } from "@/lib/order-store";
import { ADDRESS_NOTE, pickupDateLabel, storageMessage } from "@/lib/fulfilment";
import { confirmationHtml, type ReceiptExtras } from "@/lib/order-confirmation-html";
import { describeLine, formatMoney } from "@/lib/cart";
export function confirmationCopy(snapshot: OrderSnapshot, pickup: { address: string; contact: string } | null, amount: number, tax: number, mock = false, link = "", simulated = false, extras?: ReceiptExtras) {
  const { order, totals } = snapshot;
  const paragraphs = [
    ...(mock ? ["MOCK — practice order. No real payment, baking, pickup or delivery is scheduled."] : []),
    ...(mock&&simulated ? ["SIMULATED PAYMENT — walkthrough only. No Stripe payment was created. The 2% tax is an example."] : []),
    `Thank you, ${order.details.name}. ${mock ? simulated ? "Your simulated payment is complete." : "Your test payment is complete." : "Your payment is complete."}`,
    ...totals.lines.map(p => `${describeLine(p)} · ${formatMoney(p.totalCents)}`),
    `Subtotal: ${formatMoney(amount - tax)}. Tax: ${formatMoney(tax)}. Total: ${formatMoney(amount)}.`,
  ];
  if (pickup) paragraphs.push(`Porch pickup: ${pickupDateLabel(order.details.runDate)}, ${order.details.pickupPeriod}${order.details.pickupPeriod === "afternoon" ? " (from noon)" : ""}.`, storageMessage(!!order.details.requiresCooling), pickup.address, ADDRESS_NOTE, ...(pickup.contact ? [`Questions? ${pickup.contact}`] : []));
  for (const p of totals.lines.filter(p => p.line.gift)) {
    const gift=p.line.gift!;
    paragraphs.push(`Your anonymous blessing gift for ${gift.recipientName} will be delivered to ${gift.address} in Vistancia on ${pickupDateLabel(order.details.bakeId!)}. Jar and delivery are included.${mock ? " Practice only; nothing will be delivered." : ""}`);
    if(gift.verseRef) paragraphs.push(`Gift verse: ${gift.verseRef}${gift.verseNote ? ` — ${gift.verseNote}` : ""}`);
  }
  if(order.details.note) paragraphs.push(`Your order note: ${order.details.note}`);
  if (link) paragraphs.push(`Your confirmation: ${link}`);
  return { subject: `${mock ? "MOCK — practice order | " : ""}Your Heaven’s Harvest order is confirmed`, text: paragraphs.join("\n\n"), html: confirmationHtml(snapshot, pickup, amount, tax, { mock, simulated, link, extras }) };
}
