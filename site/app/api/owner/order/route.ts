import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/owner-auth";
import { sql } from "@/lib/db";
import { getStoredOrder,emailOrder } from "@/lib/order-store";
import { guideSample } from "@/lib/handoff-sample";
export async function POST(request:Request){
 if(!await isSignedIn())return NextResponse.json({error:"not_signed_in"},{status:401});
 if(guideSample)return NextResponse.json({error:"sample_preview_read_only"},{status:403});
 try{const b=await request.json();if(typeof b.orderId!=="string"||!/^[0-9a-f-]{36}$/i.test(b.orderId))return NextResponse.json({error:"invalid"},{status:422});
 const row=await getStoredOrder(b.orderId);if(!row||row.status!=="paid")return NextResponse.json({error:"not_found"},{status:404});
 if(b.action==="email"){if(!await emailOrder(row.id))return NextResponse.json({error:"email_failed"},{status:502});}
 else if(b.action==="pickup")await sql()`update checkout_orders set pickup_done=${b.done===true} where id=${row.id}::uuid`;
 else if(b.action==="gift"&&typeof b.giftId==="string"&&row.snapshot.order.lines.some(l=>l.gift?.id===b.giftId))await sql()`update checkout_orders set gifts_done=jsonb_set(gifts_done,array[${b.giftId}],${JSON.stringify(b.done===true)}::jsonb) where id=${row.id}::uuid`;
 else return NextResponse.json({error:"invalid"},{status:422});
 return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"save_failed"},{status:503});}
}
