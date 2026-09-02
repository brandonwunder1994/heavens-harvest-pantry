// The one door into the shop's own settings.
//
// Her flavours, prices, delivery days and verses are not in the site's code:
// they live in a settings table, and her owner page writes to exactly this
// table. So nothing here touches the site's files, and two people editing at
// once cannot tread on each other.

import { readFileSync } from 'node:fs';

// The shop already has the database driver installed. Borrowing it by URL means
// no second copy and no package.json of our own, and nothing in the shop's
// folder is ever written to. The URL form also survives the spaces in the path,
// which a plain filename does not.
const { neon } = await import(
  new URL('../site/node_modules/@neondatabase/serverless/index.mjs', import.meta.url).href
);

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Read the shop's own environment rather than keeping a second copy of a
  // password anywhere.
  const env = readFileSync(new URL('../site/.env.local', import.meta.url), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('No DATABASE_URL in site/.env.local');
  return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

export const sql = neon(connectionString());

/** Everything she has saved, by key. */
export async function readSettings() {
  const rows = await sql`select key, value, updated_at from settings order by key`;
  return rows;
}

/** Write one block, exactly the way her own page writes it. */
export async function saveSetting(key, value) {
  await sql`
    insert into settings (key, value, updated_at)
    values (${key}, ${JSON.stringify(value)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}
