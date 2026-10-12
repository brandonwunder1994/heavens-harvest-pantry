import { NextResponse } from "next/server";
import { getMockStripe } from "@/lib/mock-stripe";
import { isMockSession } from "@/lib/mock-policy";
import { recordMock, releaseMock, emailMock } from "@/lib/mock-store";
export async function POST(request: Request) {
  const stripe=getMockStripe(),secret=process.env.STRIPE_MOCK_WEBHOOK_SECRET,signature=request.headers.get("stripe-signature");
  if (!stripe || !secret) return NextResponse.json({error:"mock_not_configured"},{status:503});
  if (!signature) return NextResponse.json({error:"missing_signature"},{status:400});
  let event;
  try { event=await stripe.webhooks.constructEventAsync(await request.text(),signature,secret); }
  catch { return NextResponse.json({error:"invalid_signature"},{status:400}); }
  if (event.livemode) return NextResponse.json({error:"live_event_rejected"},{status:400});
  if (["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.expired"].includes(event.type)) {
    const session=event.data.object as import("stripe").default.Checkout.Session;
    if (!isMockSession(session)) return NextResponse.json({error:"non_practice_event_rejected"},{status:400});
    try {
      if (event.type==="checkout.session.expired") await releaseMock(session);
      else { const row=await recordMock(session); if (row) await emailMock(row.id); }
    } catch { return NextResponse.json({error:"not_recorded"},{status:500}); }
  }
  return NextResponse.json({received:true});
}
