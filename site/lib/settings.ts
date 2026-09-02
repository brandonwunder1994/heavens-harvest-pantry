import "server-only";
import { cache } from "react";
import { defaultShop, type Shop, type Verse } from "@/lib/content";
import { databaseReady, sql } from "@/lib/db";
import { checkBlock, mergeShop, mergeVerse, type EditableKey } from "@/lib/shop-schema";

export { editableKeys, isEditableKey, type EditableKey } from "@/lib/shop-schema";

/**
 * The owner's saved edits, laid over the defaults in `lib/content.ts`.
 *
 * Every read reports whether it actually reached the database. Customer pages
 * ignore that and render the defaults, because the shop must stay up. Her own
 * pages must NOT ignore it: showing her the sample flavors as though they were
 * hers, and then writing them over her real menu when she presses Save, is the
 * worst thing this file could do.
 */

export type ShopRead = {
  shop: Shop;
  /** True only if her settings genuinely came back from the database. */
  live: boolean;
};

type Row = { key: string; value: unknown };

/** One query per request, however many components ask for it. */
export const readShop = cache(async function readShop(): Promise<ShopRead> {
  if (!databaseReady) return { shop: defaultShop, live: false };

  try {
    const rows = (await sql()`select key, value from settings`) as Row[];
    return { shop: mergeShop(new Map(rows.map((row) => [row.key, row.value]))), live: true };
  } catch (error) {
    console.error("[settings] could not read her settings, showing the built-in defaults", error);
    return { shop: defaultShop, live: false };
  }
});

/** For customer-facing pages, which want a shop whatever happened. */
export async function getShop(): Promise<Shop> {
  return (await readShop()).shop;
}

export type SaveOutcome = { ok: true } | { ok: false; problem: string };

/**
 * Writes one block, but only after checking it. A refused save changes nothing
 * and says why; it never silently becomes the sample data.
 */
export async function saveSetting(key: EditableKey, value: unknown): Promise<SaveOutcome> {
  const check = checkBlock(key, value);
  if (!check.ok) return check;

  await sql()`
    insert into settings (key, value, updated_at)
    values (${key}, ${JSON.stringify(value)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
  return { ok: true };
}

/**
 * Every verse card that has gone out, newest first. She never edits this: it
 * fills itself when she chooses a new verse for the week.
 */
export async function verseArchive(): Promise<Verse[]> {
  if (!databaseReady) return [];
  try {
    const rows = (await sql()`select value from settings where key = 'verseArchive'`) as {
      value: unknown;
    }[];
    const raw = rows[0]?.value;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => mergeVerse(entry, { text: "", reference: "" }))
      .filter((verse) => verse.text.trim());
  } catch (error) {
    console.error("[settings] could not read the verse archive", error);
    return [];
  }
}

/**
 * Files the verse being replaced, newest first.
 *
 * Done in one statement rather than read-then-write: reading first meant a
 * momentary database blip returned an empty list and the write then replaced
 * every verse she had ever sent with a single entry.
 */
export async function archiveVerse(previous: Verse): Promise<void> {
  if (!previous.text.trim()) return;

  const entry = JSON.stringify([{ text: previous.text, reference: previous.reference }]);
  await sql()`
    insert into settings (key, value, updated_at)
    values ('verseArchive', ${entry}::jsonb, now())
    on conflict (key) do update set
      value = (
        select coalesce(jsonb_agg(kept.verse order by kept.ord), '[]'::jsonb)
        from (
          select verse, ord from (
            select distinct on (e.verse->>'text') e.verse as verse, e.ord as ord
            from jsonb_array_elements(${entry}::jsonb || settings.value)
                   with ordinality as e(verse, ord)
            order by e.verse->>'text', e.ord
          ) as unique_verses
          order by ord
          limit 200
        ) as kept
      ),
      updated_at = now()
  `;
}
