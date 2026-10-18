import "server-only";
import { sql } from "@/lib/db";
import { cleanExtras, extraSlug, noExtras, type ExtrasSetting } from "@/lib/extras";

/**
 * How many of each extra are already spoken for.
 *
 * Counted from the orders themselves rather than kept as a second number to
 * drift: every paid order, plus any order still being paid for in the last 45
 * minutes, counts. A basket someone walked away from frees itself, so a bag is
 * never stuck "held" by a customer who left.
 */
export async function extrasClaimed(setting: ExtrasSetting): Promise<Map<string, number>> {
  const claimed = new Map<string, number>();
  if (!setting.items.length) return claimed;
  const earliest = setting.items.reduce((min, i) => (i.setAt < min ? i.setAt : min), setting.items[0].setAt);
  const rows = (await sql()`
    select l->>'slug' as slug, o.created_at, coalesce(sum((l->>'qty')::int), 0)::int as qty
    from checkout_orders o, jsonb_array_elements(o.snapshot->'order'->'lines') l
    where l->>'slug' like 'extra-%'
      and o.created_at >= ${earliest}::timestamptz
      and (o.status = 'paid' or (o.status in ('open', 'preparing') and o.created_at > now() - interval '45 minutes'))
    group by l->>'slug', o.created_at
  `) as { slug: string; created_at: string; qty: number }[];
  for (const item of setting.items) {
    const key = extraSlug(item.slug, item.sizeOz);
    const since = Date.parse(item.setAt);
    let total = 0;
    for (const row of rows) if (row.slug === key && Date.parse(row.created_at) >= since) total += Number(row.qty);
    claimed.set(key, total);
  }
  return claimed;
}

export async function readExtrasSetting(): Promise<{ setting: ExtrasSetting; live: boolean }> {
  try {
    const rows = (await sql()`select value from settings where key = 'extras'`) as { value: unknown }[];
    return { setting: rows[0] ? cleanExtras(rows[0].value) : noExtras, live: true };
  } catch (error) {
    console.error("[extras] could not read the extras", error);
    return { setting: noExtras, live: false };
  }
}

export async function writeExtrasSetting(setting: ExtrasSetting): Promise<void> {
  await sql()`
    insert into settings (key, value, updated_at)
    values ('extras', ${JSON.stringify(setting)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

/**
 * True if every extra in these lines is within what she has. Before the order
 * is reserved it adds the order's own quantity; after, the order is already in
 * the count, so that second look catches two people paying for the last bag.
 */
export async function extrasWithinStock(setting: ExtrasSetting, lines: { slug: string; qty: number }[], alreadyCounted: boolean): Promise<boolean> {
  const wanted = lines.filter(l => l.slug.startsWith("extra-"));
  if (!wanted.length) return true;
  const claimed = await extrasClaimed(setting);
  return wanted.every(l => {
    const item = setting.items.find(i => extraSlug(i.slug, i.sizeOz) === l.slug);
    return !!item && (claimed.get(l.slug) ?? 0) + (alreadyCounted ? 0 : l.qty) <= item.qty;
  });
}
