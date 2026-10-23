"use client";
import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { unitPriceCents,formatMoney,blessingSurchargeCents } from "@/lib/cart";
import { BLESSING_SIZES,sizeLabel,omissionLabel,type SizeOz,type Omission } from "@/lib/products";
import { everyVerse } from "@/lib/verses";
import "./blessing-jar.css";
export function GiftComposer() {
  const cart=useCart(); const flavors=cart.shop.flavors.filter(f=>!f.soldOut);
  const [open,setOpen]=useState(false),[slug,setSlug]=useState(flavors[0]?.slug??""),[size,setSize]=useState<SizeOz>(8),[name,setName]=useState(""),[address,setAddress]=useState(""),[local,setLocal]=useState(false),[verse,setVerse]=useState(""),[note,setNote]=useState(""),[error,setError]=useState(""),[omissions,setOmissions]=useState<Omission[]>([]);
  const flavor=flavors.find(f=>f.slug===slug);
  const field="w-full border border-sand bg-cream px-3 py-3 font-ui text-[14px] text-ink";
  function add(){if(!flavor||name.trim().length<2||address.trim().length<8||!local){setError("Add the recipient’s name and address, and confirm they are in Vistancia.");return;}cart.addLine({slug,sizeOz:size,format:"jar",qty:1,omissions,gift:{id:crypto.randomUUID(),recipientName:name,address,inVistancia:local,verseRef:verse,verseNote:note}});setOpen(false);setName("");setAddress("");setLocal(false);setVerse("");setNote("");setError("");setOmissions([]);}
  return <section className="my-7 border-y border-sage py-6">
    <div className="grid items-center gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
      <figure className="mx-auto w-full max-w-[250px] sm:max-w-none">
        <div className="blessing-gift-visual"><div className="blessing-gift-float"><div className="blessing-gift-stage">
          <Image src="/blessing-jar.png" alt="Granola blessing jar with a cream ribbon and handwritten card: Praying your day is filled with peace, joy, and the reminder that you are loved. The LORD bless thee, and keep thee — Numbers 6:24." width={1064} height={1478} sizes="(max-width: 640px) 250px, 200px" quality={90} className="blessing-gift-photo h-auto w-full object-contain"/>
        </div></div></div>
        <figcaption className="mt-2 text-center font-ui text-[11px] text-muted">Example gift & prayer card</figcaption>
      </figure>
      <div><h2 className="display text-[28px]">Send an anonymous blessing gift</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-bark">Add {formatMoney(blessingSurchargeCents(cart.shop))} to your chosen granola or candied nuts for a cute gift jar and anonymous delivery in Vistancia.</p>
      {!open&&<button type="button" onClick={()=>setOpen(true)} className="stamp stamp-light mt-4">Choose a blessing gift</button>}</div>
    </div>
    {open&&<div className="mt-6 flex flex-col gap-4">
      <label className="font-ui text-[13px]">Flavor<select className={field} value={slug} onChange={e=>{setSlug(e.target.value);setOmissions([]);}}>{flavors.map(f=><option key={f.slug} value={f.slug}>{f.name}</option>)}</select></label>
      <label className="font-ui text-[13px]">Gift size<select className={field} value={size} onChange={e=>setSize(Number(e.target.value) as SizeOz)}>{BLESSING_SIZES.map(s=><option key={s} value={s}>{sizeLabel(s)} · {flavor?formatMoney(unitPriceCents(flavor,"bag",s)+blessingSurchargeCents(cart.shop)):""} including jar and delivery</option>)}</select></label>
      {!!flavor?.allowedOmissions?.length&&<fieldset><legend className="font-ui text-[13px]">Leave something out? Optional.</legend>{flavor.allowedOmissions.map(o=><label key={o} className="mt-2 flex min-h-11 items-center gap-2 font-ui text-[13px]"><input type="checkbox" checked={omissions.includes(o)} onChange={e=>setOmissions(prev=>e.target.checked?[...prev,o]:prev.filter(v=>v!==o))}/>{omissionLabel[o]}</label>)}{omissions.includes("shredded-coconut")&&<p className="font-ui text-[12px] text-muted">Coconut oil stays in the recipe.</p>}</fieldset>}
      <label className="font-ui text-[13px]">Recipient’s name<input className={field} value={name} maxLength={80} onChange={e=>setName(e.target.value)} autoComplete="off"/></label>
      <label className="font-ui text-[13px]">Recipient’s delivery address<textarea className={field} value={address} maxLength={250} onChange={e=>setAddress(e.target.value)} rows={2}/></label>
      <label className="flex min-h-11 items-center gap-2 font-ui text-[13px]"><input type="checkbox" checked={local} onChange={e=>setLocal(e.target.checked)}/>This address is in Vistancia.</label>
      <label className="font-ui text-[13px]">Verse card · optional<select className={field} value={verse} onChange={e=>setVerse(e.target.value)}><option value="">No verse card</option>{everyVerse().map(v=><option key={v.ref} value={v.ref}>{v.ref}</option>)}</select></label>
      {verse&&<label className="font-ui text-[13px]">A short anonymous note · optional<textarea className={field} value={note} maxLength={300} onChange={e=>setNote(e.target.value)}/></label>}
      <p className="font-ui text-[12px] text-muted">We deliver on Friday. Your name is not shared with the recipient.</p>
      {error&&<p role="alert" className="font-ui text-[13px] text-brown">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="button" className="stamp" onClick={add}>Add this gift</button><button type="button" className="stamp stamp-light" onClick={()=>setOpen(false)}>Cancel</button></div>
    </div>}
  </section>;
}
