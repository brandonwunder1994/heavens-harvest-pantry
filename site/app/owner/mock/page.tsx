import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isSignedIn } from "@/lib/owner-auth";
import { OwnerShell,OwnerHeading } from "@/components/owner/Shell";
import { OrderTabs } from "@/components/owner/OrderTabs";
import { listMockOrders,emailMock,reconcileMock } from "@/lib/mock-store";
import { mockPaymentsReady,mockTaxConfiguration } from "@/lib/mock-stripe";
import { mockKeysValid } from "@/lib/mock-policy";
import { mailReady } from "@/lib/mailer";
import { privatePickup } from "@/lib/order-store";
import { confirmationCopy } from "@/lib/order-confirmation";
import { uuid } from "@/lib/mock-auth";
import { isSimulatedSnapshot,simulatedReceiptUrl } from "@/lib/mock-simulation";
export const dynamic="force-dynamic";
export default async function MockOrdersPage() {
  if (!(await isSignedIn())) redirect("/owner/login?next=/mockorder/orders");
  let unavailable=false;
  let orders:Awaited<ReturnType<typeof listMockOrders>>=[];
  try { await reconcileMock();orders=await listMockOrders(); } catch { unavailable=true; }
  const pickup=await privatePickup();
  async function retry(form:FormData) {
    "use server";
    if (!(await isSignedIn())) redirect("/owner/login?next=/mockorder/orders");
    const id=form.get("id");if(uuid(id))await emailMock(id);
    revalidatePath("/owner/mock");
    revalidatePath("/mockorder/orders");
  }
  const checks=[{label:"Stripe test keys",ready:mockKeysValid(process.env)},{label:"Signed test webhook",ready:Boolean(process.env.STRIPE_MOCK_WEBHOOK_SECRET?.startsWith("whsec_"))},{label:"Test tax rates",ready:mockTaxConfiguration().ready},{label:"Confirmation emails",ready:mailReady},{label:"Private pickup address",ready:Boolean(pickup.address)}];
  return <OwnerShell active="/owner/mock"><OwnerHeading eyebrow="Private practice" title="Mock orders" note="Every receipt here is a practice order. These orders never enter your sales, bake lists, pickup lists, rewards or blessing totals."/>
    <OrderTabs mock/>
    <div className="flex flex-wrap gap-3"><Link className="stamp" href="/mockorder">Open practice shop</Link><Link className="stamp stamp-light" href="/mockorder/menu">Practice menu</Link></div>
    <section className="border border-sand bg-paper p-5"><h2 className="display text-[26px]">Simulated payment is ready</h2><p className="mt-3 max-w-[65ch] font-ui text-[14px] leading-relaxed">Use the practice shop to try a successful or declined payment, then see the receipt, pickup instructions and email preview. No Stripe keys are needed. No charge or email is sent.</p><details className="mt-5"><summary className="cursor-pointer font-ui text-[14px] text-sage">Optional Stripe test connection</summary><ul className="mt-3 grid gap-2 font-ui text-[14px] sm:grid-cols-2">{checks.map(c=><li key={c.label}>{c.ready?"Connected":"Still needed"} · {c.label}</li>)}</ul>{mockPaymentsReady()&&mailReady&&<Link className="mt-4 inline-block font-ui text-[14px] text-sage underline" href="/mockorder/checkout?payment=stripe">Use connected Stripe test checkout</Link>}</details><p className="mt-4 font-ui text-[12px] text-muted">Start over gives you an empty practice basket and a fresh practice bake. Previous mock receipts stay here.</p></section>
    {unavailable?<p role="alert" className="border border-brown p-5">Practice receipts could not load. Reload in a moment.</p>:orders.length===0?<p className="border-y border-sand py-8 text-[20px] text-muted">No completed practice orders yet.</p>:orders.map(row=>{
      const simulated=isSimulatedSnapshot(row.snapshot);
      const copy=confirmationCopy(row.snapshot,row.snapshot.totals.lines.some(p=>!p.line.gift)?pickup:null,row.amount_cents??0,row.tax_cents,true,"",simulated);
      return <article key={row.id} className="border border-sand bg-paper p-5 sm:p-7"><div className="flex flex-wrap justify-between gap-3"><h2 className="display text-[26px]">MOCK · {row.snapshot.order.details.name}</h2><span className="font-ui text-[12px] text-muted">{new Date(row.created_at).toLocaleString("en-US",{timeZone:"America/Phoenix"})} Arizona time</span></div><p className="my-3 break-all font-ui text-[12px] text-muted">Practice receipt {row.id}</p><div className="space-y-3 text-[17px]">{copy.text.split("\n\n").map((p,i)=><p key={i}>{p}</p>)}</div><div className="mt-5 border-t border-sand pt-4"><p className="break-words font-ui text-[13px]">{simulated?"Email: preview only; nothing sent.":`Email: ${row.email_status}${row.email?` · ${row.email}`:" · no purchaser email"}${row.email_error?` · ${row.email_error}`:""}`}</p><div className="mt-3 flex flex-wrap gap-3"><Link className="stamp stamp-light" href={simulated?simulatedReceiptUrl(row.id):`/mockorder/order/thank-you?session_id=${row.stripe_session}`}>Reopen mock confirmation</Link>{!simulated&&row.email_status!=="sent"&&<form action={retry}><input type="hidden" name="id" value={row.id}/><button className="stamp stamp-light">Retry mock email</button></form>}</div></div></article>;
    })}
  </OwnerShell>;
}
