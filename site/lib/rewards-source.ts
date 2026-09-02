import "server-only";
import { databaseReady, safely, sql } from "@/lib/db";
import { normaliseEmail, type Account } from "@/lib/rewards";

/** Reading and writing points. All the arithmetic lives in `lib/rewards.ts`. */

type CustomerRow = { id: number | string; email: string; name: string | null };
type PointRow = { delta: number; reason: string; created_at: string };

export async function findOrCreateCustomer(
  email: string,
  name?: string,
  phone?: string,
): Promise<number> {
  const clean = normaliseEmail(email);
  const rows = (await sql()`
    insert into customers (email, name, phone)
    values (${clean}, ${name ?? null}, ${phone ?? null})
    on conflict (lower(email)) do update
      set name  = coalesce(customers.name, excluded.name),
          phone = coalesce(customers.phone, excluded.phone)
    returning id
  `) as { id: number | string }[];
  return Number(rows[0].id);
}

/**
 * Awards points once and only once. `ref` is the Stripe session, so a webhook
 * that fires twice for the same order cannot pay out twice.
 */
export async function award(
  customerId: number,
  delta: number,
  reason: string,
  ref: string | null,
): Promise<void> {
  await sql()`
    insert into points (customer_id, delta, reason, ref)
    values (${customerId}, ${delta}, ${reason}, ${ref})
    on conflict (ref) where ref is not null do nothing
  `;
}

/**
 * `strict` means "tell me if the database was unreachable" by throwing, rather
 * than reporting a real customer as a stranger. Anything that decides whether
 * to send someone an email must use it.
 */
export async function accountFor(
  email: string,
  options: { strict?: boolean } = {},
): Promise<Account | null> {
  const clean = normaliseEmail(email);
  const read = async () => {
    const people = (await sql()`
      select id, email, name from customers where lower(email) = ${clean} limit 1
    `) as CustomerRow[];
    if (people.length === 0) return null;

    const person = people[0];
    // The balance is summed over every row in the database, not just the
    // hundred shown, or her copy of someone's points and theirs would differ.
    const [totals] = (await sql()`
      select coalesce(sum(delta), 0)::int as points from points where customer_id = ${person.id}
    `) as { points: number }[];

    const rows = (await sql()`
      select delta, reason, created_at from points
      where customer_id = ${person.id} order by created_at desc limit 100
    `) as PointRow[];

    return {
      email: person.email,
      name: person.name ?? "",
      points: Number(totals?.points ?? 0),
      history: rows.map((row) => ({
        delta: Number(row.delta),
        reason: row.reason,
        createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
      })),
    };
  };

  if (options.strict) return read();
  return safely<Account | null>("reading a rewards account", read, null);
}

export type Standing = { email: string; name: string; points: number };

export type StandingsResult =
  | { status: "ok"; standings: Standing[] }
  | { status: "not_configured" }
  | { status: "error"; message: string };

/**
 * Everyone with a balance, biggest first. Carries a status so her page can tell
 * "nobody has points yet" apart from "the points could not be read".
 */
export async function everyStanding(limit = 200): Promise<StandingsResult> {
  if (!databaseReady) return { status: "not_configured" };
  try {
    const rows = (await sql()`
      select c.email, c.name, coalesce(sum(p.delta), 0)::int as points
      from customers c left join points p on p.customer_id = c.id
      group by c.id, c.email, c.name
      order by points desc, c.email asc
      limit ${limit}
    `) as { email: string; name: string | null; points: number }[];
    return {
      status: "ok",
      standings: rows.map((row) => ({
        email: row.email,
        name: row.name ?? "",
        points: Number(row.points),
      })),
    };
  } catch (error) {
    console.error("[rewards] could not read the balances", error);
    return { status: "error", message: error instanceof Error ? error.message : "unknown" };
  }
}
