/**
 * Adds another person who can sign in to the same owner's page.
 * The password is stored only as a scrypt hash.
 *
 *   node --env-file=.env.local scripts/ensure-owner.mjs <username> <password>
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const scrypt = promisify(scryptCb);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run: vercel env pull .env.local");
  process.exit(1);
}

const username = (process.argv[2] ?? "").trim();
const password = process.argv[3] ?? "";
if (!username || !password) {
  console.error("Usage: node --env-file=.env.local scripts/ensure-owner.mjs <username> <password>");
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(username)) {
  console.error("Username must be 3–64 letters, numbers, periods, dashes, or underscores.");
  process.exit(1);
}

const sql = neon(url);

await sql.query("alter table owner_auth drop constraint if exists owner_auth_id_check");

const salt = randomBytes(16).toString("hex");
const key = await scrypt(password, salt, 64);
const passwordHash = `${salt}:${Buffer.from(key).toString("hex")}`;

const existing = await sql`
  select id from owner_auth where lower(username) = ${username.toLowerCase()}
`;

if (existing.length > 0) {
  await sql`
    update owner_auth
    set password_hash = ${passwordHash}, updated_at = now()
    where id = ${existing[0].id}
  `;
  console.log(`Updated owner login "${username}". Same owner's page as before.`);
} else {
  const next = await sql`select coalesce(max(id), 0) + 1 as id from owner_auth`;
  await sql`
    insert into owner_auth (id, username, password_hash, updated_at)
    values (${next[0].id}, ${username}, ${passwordHash}, now())
  `;
  console.log(`Added owner login "${username}". Same owner's page as before.`);
}
