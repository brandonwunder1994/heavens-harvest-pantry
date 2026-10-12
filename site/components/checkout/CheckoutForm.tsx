"use client";
import Link, { usePractice } from "@/components/ShopLink";
import { useRouter } from "next/navigation";
import { useRef,useState } from "react";
import Image from "next/image";
import { EmbeddedPayment } from "@/components/checkout/EmbeddedPayment";
import { SimulatedPayment } from "@/components/checkout/SimulatedPayment";
import { simulatedTax, type SimulatedPaymentView } from "@/lib/mock-simulation";
import { packPhotoFor } from "@/lib/jars";
import { checkoutTaxTotal, type CheckoutTaxDisplay } from "@/lib/checkout-tax";
import { GiftComposer } from "@/components/checkout/GiftComposer";
import { useCart } from "@/components/cart/CartProvider";
import { Stepper } from "@/components/cart/Stepper";
import { describeLine,formatMoney,lineKey,orderWeight } from "@/lib/cart";
import { pickupDateLabel,saturdayDate,storageMessage,ORDERS_PAUSED_MESSAGE } from "@/lib/fulfilment";
export function CheckoutForm({paymentsLive,testMode,pickupDate,publishableKey,simulate=false,confirmationEmailAvailable=true,taxDisplay=null}:{paymentsLive:boolean;testMode:boolean;pickupDate:string;publishableKey?:string;simulate?:boolean;confirmationEmailAvailable?:boolean;taxDisplay?:CheckoutTaxDisplay}) {
  const cart=useCart(),router=useRouter(),practice=usePractice();
  const [name,setName]=useState(""),[phone,setPhone]=useState(""),[note,setNote]=useState(""),[slot,setSlot]=useState(""),[failure,setFailure]=useState(""),[errors,setErrors]=useState<Record<string,string>>({}),[submitting,setSubmitting]=useState(false),[clientSecret,setClientSecret]=useState<string|null>(null),[availability,setAvailability]=useState<number|null>(null);
  const attempt=useRef<{key:string;id:string}|null>(null);
  const [simulation,setSimulation]=useState<SimulatedPaymentView|null>(null);
  const [availabilityError,setAvailabilityError]=useState("");
  const simulated=practice&&simulate;
  const taxCents=simulated?simulatedTax(cart.totals.totalCents):checkoutTaxTotal(cart.shop,cart.totals,taxDisplay);
  const personal=cart.totals.lines.filter(p=>!p.line.gift),chocolate=personal.some(p=>p.flavor.requiresCooling);
  const field="w-full border border-sand bg-cream px-3 py-3 font-ui text-[15px] text-ink";
  async function submit(event:React.FormEvent){event.preventDefault();setFailure("");setErrors({});setSubmitting(true);
    const [date,period]=slot.split(":");
    const body={lines:cart.lines,jarsReturned:0,blessingBags:0,expectedTotalCents:cart.totals.totalCents,details:{method:"dropoff",runArea:"Porch pickup",runDate:personal.length?date:pickupDate,pickupPeriod:personal.length?period:undefined,name,phone,note,prayer:"",address:""}};
    const key=JSON.stringify(body);if(attempt.current?.key!==key)attempt.current={key,id:crypto.randomUUID()};
    try {const response=await fetch(simulated?"/api/mock/simulate":practice?"/api/mock/checkout":"/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,attemptId:attempt.current.id,...(simulated?{action:"prepare"}:{})})});const data=await response.json();
      if(data.confirmationUrl){router.push(data.confirmationUrl);return;}
      if(response.status===422){setErrors(data.errors??{});setFailure(data.message??"Check the fields below and try again.");return;}
      if(!response.ok){setFailure(data.message??"Payment could not load. Please try again.");if(data.error==="session_expired"||data.error==="attempt_conflict")attempt.current=null;if(data.error==="price_changed")router.refresh();return;}
      if(simulated)setSimulation(data.simulation);else setClientSecret(data.clientSecret);
    }catch{setFailure("We could not reach checkout. Please retry. Your basket is saved.");}finally{setSubmitting(false);}
  }
  async function checkSpace(){setAvailability(null);setAvailabilityError("");try{const r=await fetch(practice?"/api/mock/capacity":"/api/capacity",{cache:"no-store"});if(!r.ok)throw new Error("unavailable");const data=await r.json();if(!Number.isFinite(data.remainingOz))throw new Error("unavailable");setAvailability(data.remainingOz);}catch{setAvailabilityError("Bake availability could not load. Please try again. We also check space before payment.");}}
  if(!cart.ready)return <p className="py-12 text-center">Fetching your order…</p>;
  if(cart.ordersPaused)return <p role="status" className="py-12">{ORDERS_PAUSED_MESSAGE}</p>;
  if(simulation&&simulated)return <SimulatedPayment payment={simulation} onBack={()=>setSimulation(null)}/>;
  if(clientSecret)return <div className="mt-6"><p className="mb-4 font-ui text-[13px] text-muted">Your bake space is held for about 30 minutes while you pay. The pickup address appears after payment.</p><EmbeddedPayment clientSecret={clientSecret} publishableKey={practice ? (publishableKey ?? "") : publishableKey}/><button className="mt-4 font-ui text-[13px] text-sage underline" type="button" onClick={()=>setClientSecret(null)}>Return to your order</button></div>;
  return <form onSubmit={submit} className="mt-8 flex flex-col gap-5" noValidate>
    <section><h2 className="display text-[28px]">Your order</h2>{cart.totals.lines.length===0?<p className="mt-3 text-[18px] text-muted">Your basket is empty. <Link href="/menu" className="text-sage underline">Choose a flavor</Link>, or send a blessing gift below.</p>:<ul className="mt-3 divide-y divide-sand">{cart.totals.lines.map(p=>{
      const photo=packPhotoFor(p.flavor,p.line.gift?"jar":p.line.format);
      return <li key={lineKey(p.line)} className="flex items-start gap-4 py-5">
        {photo&&<Image src={photo} alt={`${p.flavor.name} ${p.line.gift?"blessing jar":"bag"}`} width={720} height={1000} sizes="(max-width: 640px) 72px, 88px" className="h-28 w-[72px] shrink-0 object-contain sm:h-32 sm:w-[88px]"/>}
        <div className="flex min-w-0 flex-1 flex-col gap-3"><p className="text-[18px] leading-snug">{describeLine(p)}</p>{p.line.gift&&<p className="break-words font-ui text-[12px] text-muted">Anonymous delivery to {p.line.gift.address}. Jar and delivery included.</p>}<div className="flex w-full flex-wrap items-center justify-between gap-3"><Stepper value={p.line.qty} min={0} max={20} label={describeLine(p)} onChange={n=>cart.setLineQty(p.line,n)}/><span className="font-ui text-[14px] font-semibold tabular-nums">{formatMoney(p.totalCents)}</span></div></div>
      </li>;
    })}</ul>}<Link href="/menu" className="mt-3 inline-block font-ui text-[13px] text-sage underline">Add another flavor</Link></section>
    <GiftComposer/>
    {personal.length>0&&<fieldset><legend className="display text-[28px]">Choose your porch pickup</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{[pickupDate,saturdayDate(pickupDate)].flatMap(date=>["morning","afternoon"].map(period=><label key={`${date}:${period}`} className={`flex min-h-16 cursor-pointer items-start gap-3 border p-4 font-ui text-[14px] ${slot===`${date}:${period}`?"border-sage bg-moss":"border-sand bg-paper"}`}><input type="radio" name="pickup-slot" value={`${date}:${period}`} checked={slot===`${date}:${period}`} onChange={e=>setSlot(e.target.value)} className="mt-1 accent-[#5b3d1e]"/><span>{pickupDateLabel(date)}<br/>{period==="morning"?"Morning":"Afternoon · from noon"}</span></label>))}</div><p className="mt-3 font-ui text-[14px] text-sage">{storageMessage(chocolate)}</p><p className="mt-2 font-ui text-[12px] text-muted">We share the pickup address after payment.</p>{(errors.runDate||errors.pickupPeriod)&&<p role="alert" className="mt-2 text-brown">{errors.runDate||errors.pickupPeriod}</p>}</fieldset>}
    <section className="flex flex-col gap-4"><h2 className="display text-[28px]">Your details</h2><label className="font-ui text-[13px]">Your name<input className={field} value={name} maxLength={80} onChange={e=>setName(e.target.value)} autoComplete="name"/>{errors.name&&<span className="text-brown">{errors.name}</span>}</label><label className="font-ui text-[13px]">Phone number<input className={field} type="tel" value={phone} maxLength={40} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/>{errors.phone&&<span className="text-brown">{errors.phone}</span>}</label><label className="font-ui text-[13px]">Order note · optional<textarea className={field} value={note} maxLength={300} rows={2} onChange={e=>setNote(e.target.value)}/></label><p className="font-ui text-[12px] text-muted">{simulated?"The next step uses a sample card and shows an email preview. Nothing will be charged or sent.":confirmationEmailAvailable?"Enter your email on the secure payment form. We’ll email your confirmation.":"Enter your email on the secure payment form. Confirmation email is currently unavailable. After payment, save your on-screen receipt for your order and pickup details."}</p></section>
    <div className="border-t border-sand pt-5"><dl className="flex flex-col gap-3 font-ui text-[14px] tabular-nums" aria-live="polite" aria-atomic="true">
      <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatMoney(cart.totals.totalCents)}</dd></div>
      <div className="flex justify-between gap-4"><dt>{simulated?"Example sales tax":"Sales tax"}</dt><dd>{taxCents===null?"Unavailable":formatMoney(taxCents)}</dd></div>
      {taxCents!==null&&<div className="mt-1 flex justify-between gap-4 border-t border-sand pt-4 text-[18px] font-semibold"><dt>Total including tax</dt><dd>{formatMoney(cart.totals.totalCents+taxCents)}</dd></div>}
    </dl>{taxCents===null?<p role="status" className="mt-3 font-ui text-[12px] leading-relaxed text-muted">Tax details could not load. <button type="button" onClick={()=>router.refresh()} className="text-sage underline underline-offset-2">Retry tax details</button>, or continue to secure payment to see your tax and final total before paying.</p>:<p className="mt-3 font-ui text-[12px] leading-relaxed text-muted">{simulated?"Example tax for practice only. Nothing will be charged.":"Tax is included in the total above. Review your final total again on secure payment."}</p>}<button type="button" className="mt-3 font-ui text-[12px] text-sage underline" onClick={checkSpace}>Check space for this bake</button>{availabilityError&&<p role="alert" className="mt-2 font-ui text-[13px] text-brown">{availabilityError}</p>}{availability!==null&&<p role="status" className="mt-2 font-ui text-[13px]">{availability===0?"This bake is full.":`${(availability/16).toFixed(2)} lb remaining in this bake.`}{orderWeight(cart.lines)>availability&&" Reduce your order to fit the remaining space."}</p>}</div>
    {(failure||errors.lines||errors.gifts||errors.blessingBags)&&<p role="alert" className="border border-brown bg-paper p-4 font-ui text-[14px] text-brown">{errors.lines||errors.gifts||errors.blessingBags||failure}</p>}
    {!paymentsLive&&<p role="status" className="font-ui text-[13px] text-brown">{practice ? "Practice payment is waiting for the Stripe test keys and email connection. You can explore the menu, basket and pickup options now." : "Online payment is being finished. Your basket is saved."}</p>}{testMode&&<p className="font-ui text-[12px] text-muted">{simulated?"Simulated checkout: sample card, example tax, and no real charge.":"Test checkout: no real charge will be made."}</p>}
    <button className="stamp w-full disabled:opacity-60" type="submit" disabled={submitting||cart.totals.itemCount===0||!paymentsLive}>{submitting?"Checking bake space…":"Continue to secure payment"}</button>
  </form>;
}
