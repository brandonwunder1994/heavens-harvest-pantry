/**
 * Creates every table the site needs. Safe to run as many times as you like.
 *
 *   node --env-file=.env.local scripts/migrate.mjs
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run: vercel env pull .env.local");
  process.exit(1);
}

const sql = neon(url);

const steps = [
  [
    "settings",
    `create table if not exists settings (
       key        text primary key,
       value      jsonb not null,
       updated_at timestamptz not null default now()
     )`,
  ],
  [
    "customers",
    `create table if not exists customers (
       id         bigserial primary key,
       email      text not null,
       name       text,
       phone      text,
       created_at timestamptz not null default now()
     )`,
  ],
  ["customers email index", `create unique index if not exists customers_email_key on customers (lower(email))`],
  [
    "points",
    `create table if not exists points (
       id          bigserial primary key,
       customer_id bigint not null references customers(id) on delete cascade,
       delta       integer not null,
       reason      text not null,
       ref         text,
       created_at  timestamptz not null default now()
     )`,
  ],
  ["points ref guard", `create unique index if not exists points_ref_key on points (ref) where ref is not null`],
  ["points customer index", `create index if not exists points_customer_idx on points (customer_id)`],
  [
    "reviews",
    `create table if not exists reviews (
       id         bigserial primary key,
       name       text not null,
       email      text,
       flavor     text,
       rating     integer not null check (rating between 1 and 5),
       body       text not null,
       approved   boolean not null default false,
       created_at timestamptz not null default now()
     )`,
  ],
  ["reviews approved index", `create index if not exists reviews_approved_idx on reviews (approved, created_at desc)`],
  [
    "login links",
    `create table if not exists login_links (
       token_hash text primary key,
       email      text not null,
       expires_at timestamptz not null,
       used_at    timestamptz,
       created_at timestamptz not null default now()
     )`,
  ],
];

for (const [name, statement] of steps) {
  await sql.query(statement);
  console.log(`  ok  ${name}`);
}

console.log("\nSchema is up to date.");
