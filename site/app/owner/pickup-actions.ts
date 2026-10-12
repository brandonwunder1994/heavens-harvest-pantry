"use server";
import { isSignedIn } from "@/lib/owner-auth";
import { sql } from "@/lib/db";
import type { SaveState } from "@/lib/save-state";
import { guideSample } from "@/lib/handoff-sample";
export async function savePrivatePickup(_previous:SaveState,form:FormData):Promise<SaveState>{
  if(guideSample)return {ok:false,message:"Sample preview only. Changes are not saved."};
  if(!await isSignedIn())return {ok:false,message:"Sign in again before saving."};
  const address=String(form.get("address")??"").trim().slice(0,250),contact=String(form.get("contact")??"").trim().slice(0,100);
  if(address.length<8)return {ok:false,message:"Enter the full pickup address."};
  try {await sql()`insert into settings(key,value) values('privatePickup',${JSON.stringify({address,contact})}::jsonb) on conflict(key) do update set value=excluded.value,updated_at=now()`;return {ok:true,message:"Saved. Only paid customers can see the pickup address."};}
  catch{return {ok:false,message:"The address did not save. Try again."};}
}
