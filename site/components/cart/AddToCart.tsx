"use client";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Stepper } from "@/components/cart/Stepper";
import { MAX_QTY_PER_LINE, formatMoney, unitPriceCents, lineKey, type Format, type CartLine } from "@/lib/cart";
import { flavorSizes, omissionLabel, sizeLabel, type SizeOz, type Omission } from "@/lib/products";
import type { Flavor } from "@/lib/content";
export function AddToCart({flavor,actionLabel,onFormatChange,onSizeChange,sizeOz}: {flavor:Flavor;actionLabel?:string;onFormatChange?:(format:Format)=>void;onSizeChange?:(size:SizeOz)=>void;sizeOz?:SizeOz}) {
  const cart=useCart();
  const [localSize,setSize]=useState<SizeOz>(8);
  const size=sizeOz??localSize;
  const [omissions,setOmissions]=useState<Omission[]>([]);
  const line:CartLine={slug:flavor.slug,format:size===3?"sampler":"bag",sizeOz:size,omissions,qty:1};
  const qty=cart.ready?(cart.lines.find(l=>lineKey(l)===lineKey(line))?.qty??0):0;
  return <div className="flex flex-col items-start gap-4">
    <div className="flex flex-wrap gap-2" role="group" aria-label={`Bag size for ${flavor.name}`}>
      {flavorSizes(flavor).map(s=><button key={s} type="button" aria-pressed={s===size} onClick={()=>{setSize(s);onSizeChange?.(s);onFormatChange?.(s===3?"sampler":"bag");}} className={`min-h-11 border border-brown px-3 py-2 font-ui text-[13px] ${s===size?"bg-brown text-cream":"bg-cream text-brown hover:bg-paper"}`}>{sizeLabel(s)} · {formatMoney(unitPriceCents(flavor,s===3?"sampler":"bag",s))}</button>)}
    </div>
    {!!flavor.allowedOmissions?.length && <fieldset className="flex flex-wrap gap-4"><legend className="mb-2 font-ui text-[12px] text-muted">Leave something out? Optional.</legend>{flavor.allowedOmissions.map(o=><label key={o} className="flex min-h-11 items-center gap-2 font-ui text-[13px]"><input type="checkbox" checked={omissions.includes(o)} onChange={e=>setOmissions(prev=>e.target.checked?[...prev,o]:prev.filter(v=>v!==o))} className="h-4 w-4 accent-[#5b3d1e]"/>{omissionLabel[o]}</label>)}{omissions.includes("shredded-coconut")&&<p className="w-full font-ui text-[12px] text-muted">Coconut oil stays in the recipe.</p>}</fieldset>}
    {cart.ordersPaused?<button type="button" disabled className="stamp opacity-60">Ordering paused</button>:qty>0?<Stepper value={qty} min={0} max={MAX_QTY_PER_LINE} label={`${flavor.name}, ${sizeLabel(size)}`} onChange={n=>cart.setLineQty(line,n)}/>:<button type="button" className="stamp !min-h-11" onClick={()=>cart.addLine(line)}>{actionLabel??`Add ${sizeLabel(size)} bag`}</button>}
  </div>;
}
