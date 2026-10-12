"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/cart";
import type { SimulatedPaymentView } from "@/lib/mock-simulation";

export function SimulatedPayment({ payment, onBack }: { payment: SimulatedPaymentView; onBack: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("practice@example.com");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  async function complete(outcome: "success" | "declined") {
    setBusy(true); setFailure("");
    try {
      const response = await fetch("/api/mock/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", orderId: payment.orderId, email, outcome }) });
      const data = await response.json();
      if (!response.ok) { setFailure(data.message ?? "Practice payment could not finish. Try again."); return; }
      router.push(data.confirmationUrl);
    } catch { setFailure("We could not finish the practice payment. Try again; your order is saved."); }
    finally { setBusy(false); }
  }
  const field = "mt-2 w-full border border-sand bg-cream px-3 py-3 font-ui text-[15px] text-ink";
  return <section aria-label="Simulated payment" className="mt-8 border border-sage bg-paper p-5 sm:p-7">
    <h2 className="display text-[32px]">Practice payment</h2>
    <p className="mt-3 font-ui text-[14px] leading-relaxed text-brown">This is a simulation of the payment step. No charge, Stripe payment, or email will be sent. Use the sample card below.</p>
    <ul className="mt-6 divide-y divide-sand">{payment.lines.map((line, i) => <li key={i} className="flex justify-between gap-4 py-3 font-ui text-[14px]"><span>{line.description}</span><span className="shrink-0">{formatMoney(line.totalCents)}</span></li>)}</ul>
    <dl className="space-y-3 border-y border-sand py-4 font-ui text-[14px]">
      <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatMoney(payment.subtotalCents)}</dd></div>
      <div className="flex justify-between gap-4"><dt>Example tax · 2%</dt><dd>{formatMoney(payment.taxCents)}</dd></div>
      <div className="flex justify-between gap-4 text-[18px] font-semibold"><dt>Practice total</dt><dd>{formatMoney(payment.totalCents)}</dd></div>
    </dl>
    <p className="mt-3 font-ui text-[12px] leading-relaxed text-muted">The tax is an example for this walkthrough. Connected checkout uses your configured tax rates.</p>
    <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); void complete("success"); }}>
      <label className="block font-ui text-[13px]">Email for the preview<input className={field} type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/></label>
      <label className="block font-ui text-[13px]">Sample card number<input className={field} readOnly value="4242 4242 4242 4242" tabIndex={-1}/></label>
      <div className="grid grid-cols-2 gap-4"><label className="font-ui text-[13px]">Sample expiry<input className={field} readOnly value="12 / 30" tabIndex={-1}/></label><label className="font-ui text-[13px]">Sample CVC<input className={field} readOnly value="123" tabIndex={-1}/></label></div>
      {failure && <p role="alert" className="border border-brown p-4 font-ui text-[14px] leading-relaxed text-brown">{failure}</p>}
      <button className="stamp w-full disabled:opacity-60" type="submit" disabled={busy}>{busy ? "Finishing practice payment…" : "Complete practice payment"}</button>
      <button className="stamp stamp-light w-full disabled:opacity-60" type="button" disabled={busy} onClick={() => void complete("declined")}>Try a declined payment</button>
    </form>
    <button className="mt-5 min-h-11 font-ui text-[13px] text-sage underline" type="button" disabled={busy} onClick={onBack}>Return to your order</button>
  </section>;
}
