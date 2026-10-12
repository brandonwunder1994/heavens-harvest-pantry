"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function OrderAction({orderId,action,giftId,done}:{orderId:string;action:"pickup"|"gift"|"email";giftId?:string;done?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");const router=useRouter();
 async function submit(){setBusy(true);setError("");try{const r=await fetch("/api/owner/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,action,giftId,done:!done})});if(r.status===401){setError("Your sign-in expired. Open the page again.");return;}if(!r.ok)throw new Error("That did not save. Please try again.");router.refresh();}catch{setError("That did not save. Please try again.");}finally{setBusy(false);}}
 return <div><button className="stamp stamp-light !min-h-11 !px-3 !text-[11px] disabled:opacity-60" type="button" onClick={submit} disabled={busy}>{busy?"Saving…":action==="email"?"Retry confirmation email":done?"Undo completion":action==="gift"?"Mark delivered":"Mark picked up"}</button>{error&&<p role="alert" className="mt-2 font-ui text-[12px] text-brown">{error}</p>}</div>;
}
