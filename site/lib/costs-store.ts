import "server-only";
import { sql } from "@/lib/db";
import { cleanCosts, emptyCosts, type Costs } from "@/lib/costs";

/**
 * Her ingredient prices and batch recipes, kept as one block in the same
 * settings table as everything else she edits. `live` is false when the
 * database could not be reached, so her page never shows a blank sheet as if
 * it were hers and then saves it over the real one.
 */
export async function readCosts(): Promise<{ costs: Costs; live: boolean }> {
  try {
    const rows = (await sql()`select value from settings where key = 'costs'`) as { value: unknown }[];
    return { costs: rows[0] ? cleanCosts(rows[0].value) : emptyCosts(), live: true };
  } catch (error) {
    console.error("[costs] could not read the cost sheet", error);
    return { costs: emptyCosts(), live: false };
  }
}

export async function writeCosts(costs: Costs): Promise<void> {
  await sql()`
    insert into settings (key, value, updated_at)
    values ('costs', ${JSON.stringify(costs)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}
