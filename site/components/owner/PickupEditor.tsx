"use client";
import { useActionState, useState, useCallback } from "react";
import { savePrivatePickup } from "@/app/owner/pickup-actions";
import { idle } from "@/lib/save-state";
import { SaveBar,inputClass,Labelled } from "@/components/owner/SaveBar";
export function PickupEditor({address,contact}:{address:string;contact:string}){
 const [state,action]=useActionState(savePrivatePickup,idle);
 const [dirty,setDirty]=useState(false);
 const settled=useCallback(()=>setDirty(false),[]);
 return <form action={action} onChange={()=>setDirty(true)} className="flex max-w-[700px] flex-col gap-4"><h2 className="display text-[28px]">Pickup details</h2><p className="font-ui text-[14px] text-muted">Orders close Tuesday at 9 p.m. Arizona time. Customers choose Friday or Saturday, morning or afternoon. Afternoon starts at noon.</p><Labelled label="Private pickup address" hint="Only shown on paid confirmations and in confirmation emails."><textarea name="address" defaultValue={address} maxLength={250} rows={2} className={inputClass}/></Labelled><Labelled label="Contact number or email · optional" hint="Included with paid pickup details."><input name="contact" defaultValue={contact} maxLength={100} className={inputClass}/></Labelled><SaveBar state={state} label="Save pickup details" dirty={dirty} onSaved={settled}/></form>;
}
