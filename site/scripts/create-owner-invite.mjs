/**
 * Creates (or replaces) a seven-day, one-time owner setup invitation.
 *
 *   node --env-file=.env.local scripts/create-owner-invite.mjs
 */
import { createHmac, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run: vercel env pull .env.local");
  process.exit(1);
}

const token = randomBytes(32).toString("base64url");
const tokenHash = createHmac("sha256", "heavens-harvest-owner-invite").update(token).digest("hex");
const sql = neon(url);

const rows = await sql`
  insert into owner_auth (id, setup_token_hash, setup_expires_at)
  values (1, ${tokenHash}, now() + interval '7 days')
  on conflict (id) do update
  set setup_token_hash = excluded.setup_token_hash, setup_expires_at = excluded.setup_expires_at, updated_at = now()
  where owner_auth.username is null
  returning setup_expires_at
`;

if (rows.length === 0) {
  console.error("An owner account already exists. Refusing to replace it with a setup invite.");
  process.exit(1);
}

const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://heavens-harvest-pantry.vercel.app";
console.log(`Setup link (expires ${new Date(rows[0].setup_expires_at).toLocaleString()}):`);
console.log(`${origin.replace(/\/$/, "")}/owner/setup?token=${token}`);
