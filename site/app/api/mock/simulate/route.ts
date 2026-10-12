import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { mockRun, sameOrigin, uuid } from "@/lib/mock-auth";
import { validateOrder } from "@/lib/order";
import { readShop } from "@/lib/settings";
import { mockOrder, reserveMock } from "@/lib/mock-store";
import { completeSimulatedOrder, expireSimulatedOrders } from "@/lib/mock-simulation-store";
import { isSimulatedSnapshot, simulatedPaymentView, simulatedReceiptUrl, simulatedTax } from "@/lib/mock-simulation";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "invalid_origin" }, 403);
  try {
    const run = await mockRun();
    if (!run) return reply({ error: "owner_login_required", message: "Sign in to the owner portal to practice." }, 401);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "bad_request" }, 400);
    await expireSimulatedOrders(run);
    if (body.action === "complete") {
      if (!uuid(body.orderId)) return reply({ error: "invalid_order" }, 422);
      const existing = await mockOrder(body.orderId, run);
      if (!existing || !isSimulatedSnapshot(existing.snapshot)) return reply({ error: "not_found" }, 404);
      if (existing.status === "paid") return reply({ confirmationUrl: simulatedReceiptUrl(existing.id) });
      if (existing.status === "released") return reply({ error: "session_expired", message: "Your practice payment expired. Return to your order and continue again." }, 409);
      if (body.outcome === "declined") return reply({ error: "simulated_decline", message: "Practice decline: your card was declined. No payment was made. Try the successful payment button to continue." }, 402);
      if (body.outcome !== "success") return reply({ error: "invalid_outcome" }, 422);
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: "invalid_email", message: "Enter an email address for the preview. Nothing will be sent." }, 422);
      const row = await completeSimulatedOrder(existing.id, run, email);
      return row ? reply({ confirmationUrl: simulatedReceiptUrl(row.id) }) : reply({ error: "session_expired", message: "Your practice payment expired. Return to your order and continue again." }, 409);
    }
    if (body.action !== "prepare" || !uuid(body.attemptId)) return reply({ error: "invalid_attempt" }, 422);
    const { action, attemptId, ...input } = body; void action;
    const fingerprint = createHash("sha256").update(`simulation/${JSON.stringify(input)}`).digest("hex");
    let row = await mockOrder(attemptId);
    if (row && (row.run_id !== run || row.fingerprint !== fingerprint || !isSimulatedSnapshot(row.snapshot))) return reply({ error: "attempt_conflict", message: "Your practice order changed. Try again." }, 409);
    if (row?.status === "paid") return reply({ confirmationUrl: simulatedReceiptUrl(row.id) });
    if (row?.status === "released") return reply({ error: "session_expired", message: "Your practice payment expired. Continue again to start a new payment." }, 409);
    if (!row) {
      const { shop, live } = await readShop();
      if (!live) return reply({ error: "menu_unavailable", message: "The current menu could not load. Try again." }, 503);
      const result = validateOrder(shop, input);
      if (!result.ok) return reply({ error: "invalid", errors: result.errors }, 422);
      if (Number(input.expectedTotalCents) !== result.totals.totalCents) return reply({ error: "price_changed", message: "Prices changed. Review your order and continue again." }, 409);
      row = await reserveMock(attemptId, run, fingerprint, {
        order: result.order, totals: result.totals,
        ...{ simulation: { version: 1, taxCents: simulatedTax(result.totals.totalCents), expiresAt: Math.floor(Date.now() / 1000) + 1800 } },
      });
      if (!row) return reply({ error: "bake_full", message: "Your practice bake is full. Reduce the quantity or use Start over for fresh practice space." }, 409);
    }
    if (!isSimulatedSnapshot(row.snapshot)) throw new Error("Not a simulated order");
    return reply({ simulation: simulatedPaymentView(row.id, row.snapshot) });
  } catch {
    return reply({ error: "simulation_unavailable", message: "Practice payment could not load. Retry this checkout; your basket is saved." }, 503);
  }
}
