import { redirect } from "next/navigation";
import Link from "@/components/ShopLink";
import { mockRun } from "@/lib/mock-auth";
import { isSignedIn } from "@/lib/owner-auth";
import { getMockStripe } from "@/lib/mock-stripe";
import { recordMock,emailMock,mockOrder,type MockOrder } from "@/lib/mock-store";
import { privatePickup } from "@/lib/order-store";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";
import { uuid } from "@/lib/mock-auth";
import { isSimulatedSnapshot,simulatedReceiptUrl } from "@/lib/mock-simulation";
export default async function MockConfirmation({searchParams}:{searchParams:Promise<{session_id?:string;order_id?:string}>}) {
  const {session_id:id,order_id:simulatedId}=await searchParams;
  if (!(await isSignedIn())) redirect(`/owner/login?next=${encodeURIComponent(uuid(simulatedId)?simulatedReceiptUrl(simulatedId):`/mockorder/order/thank-you?session_id=${id??""}`)}`);
  const stripe=getMockStripe(); let row:MockOrder|null=null;
  if(uuid(simulatedId)) {
    const candidate=await mockOrder(simulatedId);
    if(candidate?.status==='paid'&&isSimulatedSnapshot(candidate.snapshot))row=candidate;
  } else if (stripe && id?.startsWith("cs_test_")) try {
    row=await recordMock(await stripe.checkout.sessions.retrieve(id));
    if (row) { await emailMock(row.id); row=await mockOrder(row.id); }
  } catch { /* Unverified test payments never reveal the pickup address. */ }
  if (!row) return <div className="mx-auto max-w-[640px] px-6 pb-16"><h1 className="display text-[40px]">Practice payment is not confirmed yet.</h1><p className="my-5 text-[19px]">Return to your practice checkout to review or retry. Pickup details appear after a successful test payment.</p><Link href="/checkout" className="stamp">Practice checkout</Link></div>;
  const pickup=row.snapshot.totals.lines.some(p=>!p.line.gift)?await privatePickup():null;
  return <OrderConfirmation stored={row} pickup={pickup} tax={row.tax_cents} mock simulated={isSimulatedSnapshot(row.snapshot)} clearCart={(await mockRun())===row.run_id}/>;
}
