create table if not exists bake_batches (
  id date primary key,
  capacity_oz integer not null default 768 check (capacity_oz = 768),
  reserved_oz integer not null default 0 check (reserved_oz between 0 and 768)
);
create table if not exists checkout_orders (
  id uuid primary key,
  fingerprint text not null,
  bake_id date not null references bake_batches(id),
  ounces integer not null check (ounces > 0 and ounces <= 768),
  status text not null default 'preparing' check (status in ('preparing','open','paid','released')),
  stripe_session text unique,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  email text not null default '',
  amount_cents integer,
  pickup_done boolean not null default false,
  gifts_done jsonb not null default '{}'::jsonb,
  email_status text not null default 'pending' check (email_status in ('pending','sending','sent','error')),
  email_claim_at timestamptz,
  email_error text not null default ''
);
create index if not exists checkout_orders_bake_idx on checkout_orders(bake_id,status);
alter table checkout_orders add column if not exists email_first_attempt_at timestamptz;
alter table checkout_orders add column if not exists email_payload jsonb;
alter table checkout_orders add column if not exists email_uncertain boolean not null default false;
create or replace function reserve_bake_order(p_id uuid, p_fingerprint text, p_bake date, p_ounces integer, p_snapshot jsonb)
returns setof checkout_orders language plpgsql as $$
declare existing checkout_orders;
begin
  insert into bake_batches(id) values(p_bake) on conflict do nothing;
  perform 1 from bake_batches where id=p_bake for update;
  select * into existing from checkout_orders where id=p_id;
  if found then
    if existing.fingerprint <> p_fingerprint then raise exception 'attempt_conflict'; end if;
    return next existing; return;
  end if;
  update bake_batches set reserved_oz=reserved_oz+p_ounces
    where id=p_bake and p_ounces>0 and reserved_oz+p_ounces<=capacity_oz;
  if not found then return; end if;
  return query insert into checkout_orders(id,fingerprint,bake_id,ounces,snapshot)
    values(p_id,p_fingerprint,p_bake,p_ounces,p_snapshot) returning *;
end; $$;
create or replace function release_bake_order(p_id uuid)
returns boolean language plpgsql as $$
declare b date; w integer;
begin
  -- Same lock order as reservation avoids deadlocks. Paid orders never release space.
  select bake_id into b from checkout_orders where id=p_id;
  if b is null then return false; end if;
  perform 1 from bake_batches where id=b for update;
  update checkout_orders set status='released' where id=p_id and status in ('preparing','open') returning ounces into w;
  if w is null then return false; end if;
  update bake_batches set reserved_oz=reserved_oz-w where id=b;
  return true;
end; $$;
