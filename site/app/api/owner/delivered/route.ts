import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/owner-auth";
import { markDelivered } from "@/lib/orders-source";

export async function POST(request: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  }

  let body: { orderId?: unknown; delivered?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId.startsWith("cs_")) {
    return NextResponse.json({ error: "bad_order_id" }, { status: 400 });
  }

  try {
    const ok = await markDelivered(orderId, body.delivered === true);
    if (!ok) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[owner] mark delivered failed:", message);
    return NextResponse.json({ error: "stripe_error" }, { status: 502 });
  }
}
