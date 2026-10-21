import "server-only";
import { sql } from "@/lib/db";
import { cleanGiveaway, noGiveaway, type EntryDraft, type GiveawaySetting } from "@/lib/giveaway";

/** Reading and writing the giveaway. The rules live in `lib/giveaway.ts`. */

export type Entry = {
  id: number;
  name: string;
  email: string;
  instagram: string;
  phone: string;
  verified: boolean;
  winner: boolean;
  createdAt: number;
};

type Row = {
  id: number | string;
  name: string;
  email: string;
  instagram: string;
  phone: string | null;
  verified: boolean;
  winner: boolean;
  created_at: string;
};

const toEntry = (row: Row): Entry => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
  instagram: row.instagram,
  phone: row.phone ?? "",
  verified: row.verified,
  winner: row.winner,
  createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
});

let ready: Promise<void> | null = null;

/**
 * The table is also in `scripts/migrate.mjs`. Creating it here as well means
 * the first entry never fails just because nobody has run the migration yet.
 */
function ensureTable(): Promise<void> {
  ready ??= (async () => {
    await sql()`
      create table if not exists giveaway_entries (
        id          bigserial primary key,
        round       text not null,
        name        text not null,
        email       text not null,
        instagram   text not null,
        phone       text,
        verified    boolean not null default false,
        verified_at timestamptz,
        winner      boolean not null default false,
        created_at  timestamptz not null default now()
      )
    `;
    await sql()`create unique index if not exists giveaway_entries_email_key on giveaway_entries (round, email)`;
    await sql()`create unique index if not exists giveaway_entries_instagram_key on giveaway_entries (round, instagram)`;
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export async function readGiveaway(): Promise<{ setting: GiveawaySetting; live: boolean }> {
  try {
    const rows = (await sql()`select value from settings where key = 'giveaway'`) as { value: unknown }[];
    return { setting: rows[0] ? cleanGiveaway(rows[0].value) : noGiveaway, live: true };
  } catch (error) {
    console.error("[giveaway] could not read the setting", error);
    return { setting: noGiveaway, live: false };
  }
}

export async function writeGiveaway(setting: GiveawaySetting): Promise<void> {
  await sql()`
    insert into settings (key, value, updated_at)
    values ('giveaway', ${JSON.stringify(setting)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

export type AddResult = "added" | "duplicate_email" | "duplicate_instagram";

export async function addEntry(round: string, draft: EntryDraft): Promise<AddResult> {
  await ensureTable();
  const db = sql();
  // Look first so the entrant is told which of the two is the repeat; the
  // unique indexes still catch two people racing each other.
  const seen = (await db`
    select email, instagram from giveaway_entries
    where round = ${round} and (email = ${draft.email} or instagram = ${draft.instagram})
  `) as { email: string; instagram: string }[];
  if (seen.some((row) => row.email === draft.email)) return "duplicate_email";
  if (seen.some((row) => row.instagram === draft.instagram)) return "duplicate_instagram";

  try {
    await db`
      insert into giveaway_entries (round, name, email, instagram, phone)
      values (${round}, ${draft.name}, ${draft.email}, ${draft.instagram}, ${draft.phone || null})
    `;
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique/i.test(error.message)) {
      return /instagram/i.test(error.message) ? "duplicate_instagram" : "duplicate_email";
    }
    throw error;
  }
  return "added";
}

/** Everything for the owner: waiting ones first. */
export async function listEntries(round: string): Promise<Entry[]> {
  await ensureTable();
  const rows = (await sql()`
    select id, name, email, instagram, phone, verified, winner, created_at
    from giveaway_entries where round = ${round}
    order by verified asc, created_at desc
  `) as Row[];
  return rows.map(toEntry);
}

/** The people on the wheel: verified only, in a steady order. */
export async function verifiedEntries(round: string): Promise<Entry[]> {
  await ensureTable();
  const rows = (await sql()`
    select id, name, email, instagram, phone, verified, winner, created_at
    from giveaway_entries where round = ${round} and verified = true
    order by id asc
  `) as Row[];
  return rows.map(toEntry);
}

export async function getEntry(id: number): Promise<Entry | null> {
  await ensureTable();
  const rows = (await sql()`
    select id, name, email, instagram, phone, verified, winner, created_at
    from giveaway_entries where id = ${id}
  `) as Row[];
  return rows[0] ? toEntry(rows[0]) : null;
}

/** True only if this call is the one that flipped it, so the email goes out once. */
export async function markVerified(id: number): Promise<boolean> {
  await ensureTable();
  const rows = await sql()`
    update giveaway_entries set verified = true, verified_at = now()
    where id = ${id} and verified = false returning id
  `;
  return rows.length > 0;
}

export async function removeEntry(id: number): Promise<void> {
  await ensureTable();
  await sql()`delete from giveaway_entries where id = ${id}`;
}

/** Chosen here, on the server, by the database's own random number. */
export async function pickWinner(round: string): Promise<Entry | null> {
  await ensureTable();
  const db = sql();
  const picked = (await db`
    select id from giveaway_entries where round = ${round} and verified = true
    order by random() limit 1
  `) as { id: number | string }[];
  if (!picked[0]) return null;
  await db`update giveaway_entries set winner = (id = ${Number(picked[0].id)}) where round = ${round} and (winner = true or id = ${Number(picked[0].id)})`;
  return getEntry(Number(picked[0].id));
}

export async function currentWinner(round: string): Promise<Entry | null> {
  await ensureTable();
  const rows = (await sql()`
    select id, name, email, instagram, phone, verified, winner, created_at
    from giveaway_entries where round = ${round} and winner = true limit 1
  `) as Row[];
  return rows[0] ? toEntry(rows[0]) : null;
}

export async function clearWinner(round: string): Promise<void> {
  await ensureTable();
  await sql()`update giveaway_entries set winner = false where round = ${round}`;
}
