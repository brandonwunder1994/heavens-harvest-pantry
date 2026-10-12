import "server-only";
import { sql } from "@/lib/db";
import { isSimulatedSnapshot } from "@/lib/mock-simulation";
import type { MockOrder } from "@/lib/mock-store";

async function mockOrder(id: string, run: string) {
  const rows=await sql()`select * from mock_checkout_orders where id=${id}::uuid and run_id=${run}::uuid`;
  return rows[0] as MockOrder ?? null;
}

export async function completeSimulatedOrder(id: string, run: string, email: string) {
  const row = await mockOrder(id, run);
  if (!row || !isSimulatedSnapshot(row.snapshot)) return null;
  if(row.status==='paid')return row;
  // The stored, server-priced snapshot is the only source for the amount.
  // Only practice tables are touched. This does not create a Stripe session.
  const rows = await sql()`update mock_checkout_orders set status='paid',
    stripe_session=${`sim_${id}`},email=${email},
    amount_cents=${row.snapshot.totals.totalCents + row.snapshot.simulation.taxCents},
    tax_cents=${row.snapshot.simulation.taxCents},email_status='pending',
    email_error='Simulated email preview only. Nothing was sent.'
    where id=${id}::uuid and run_id=${run}::uuid
      and (stripe_session is null or stripe_session=${`sim_${id}`})
      and snapshot->'simulation'->>'version'='1'
      and status in ('preparing','open')
      and (snapshot->'simulation'->>'expiresAt')::bigint > extract(epoch from now())
    returning id`;
  const saved=await mockOrder(id, run);
  return rows.length||saved?.status==='paid' ? saved : null;
}
export async function expireSimulatedOrders(run?: string) {
  const rows = run
    ? await sql()`select id from mock_checkout_orders where run_id=${run}::uuid and status in ('preparing','open') and snapshot->'simulation'->>'version'='1' and (snapshot->'simulation'->>'expiresAt')::bigint <= extract(epoch from now())`
    : await sql()`select id from mock_checkout_orders where status in ('preparing','open') and snapshot->'simulation'->>'version'='1' and (snapshot->'simulation'->>'expiresAt')::bigint <= extract(epoch from now())`;
  for (const row of rows) await sql()`select release_mock_order(${row.id}::uuid)`;
}
