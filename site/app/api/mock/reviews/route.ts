import { NextResponse } from "next/server";
import { mockRun,sameOrigin } from "@/lib/mock-auth";
import { checkReview } from "@/lib/reviews";
import { readShop } from "@/lib/settings";
import { sql } from "@/lib/db";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({error:"invalid_origin"},{status:403});
  const run=await mockRun();if(!run)return NextResponse.json({error:"owner_login_required"},{status:401});
  let body;try{body=await request.json();}catch{return NextResponse.json({error:"bad_request"},{status:400});}
  const {shop,live}=await readShop();if(!live)return NextResponse.json({error:"menu_unavailable"},{status:503});
  const result=checkReview(body,shop.flavors.map(f=>f.name));
  if(!result.ok)return NextResponse.json({errors:result.errors},{status:422});
  await sql()`insert into mock_reviews(run_id,draft) values(${run}::uuid,${JSON.stringify(result.draft)}::jsonb)`;
  return NextResponse.json({received:true,mock:true});
}
