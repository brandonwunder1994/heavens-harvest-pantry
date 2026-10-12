import { NextResponse } from "next/server";
import { capacity } from "@/lib/order-store";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json(await capacity(),{headers:{"Cache-Control":"no-store"}}); }
  catch { return NextResponse.json({message:"Bake availability is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}}); }
}
