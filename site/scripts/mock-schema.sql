-- Practice orders have no foreign keys or writes to production business tables.
create table if not exists mock_runs (id uuid primary key, created_at timestamptz not null default now());
create table if not exists mock_bake_batches (
  run_id uuid references mock_runs(id), id date, capacity_oz integer not null default 768 check(capacity_oz=768),
  reserved_oz integer not null default 0 check(reserved_oz between 0 and 768), primary key(run_id,id)
);
create table if not exists mock_checkout_orders (
  id uuid primary key, run_id uuid not null references mock_runs(id), fingerprint text not null,
  bake_id date not null, ounces integer not null check(ounces>0 and ounces<=768),
  status text not null default 'preparing' check(status in ('preparing','open','paid','released')),
  stripe_session text unique, snapshot jsonb not null, created_at timestamptz not null default now(),
  email text not null default '', amount_cents integer, tax_cents integer not null default 0,
  pickup_done boolean not null default false, gifts_done jsonb not null default '{}',
  email_status text not null default 'pending' check(email_status in ('pending','sending','sent','error')),
  email_claim_at timestamptz, email_error text not null default '',
  foreign key(run_id,bake_id) references mock_bake_batches(run_id,id)
);
create index if not exists mock_orders_run_idx on mock_checkout_orders(run_id,status);
create table if not exists mock_reviews (
  id bigint generated always as identity primary key,
  run_id uuid not null references mock_runs(id), draft jsonb not null,
  created_at timestamptz not null default now()
);
create or replace function reserve_mock_order(p_id uuid,p_run uuid,p_fingerprint text,p_bake date,p_ounces integer,p_snapshot jsonb)
returns setof mock_checkout_orders language plpgsql as $$
declare existing mock_checkout_orders;
begin
  insert into mock_bake_batches(run_id,id) values(p_run,p_bake) on conflict do nothing;
  perform 1 from mock_bake_batches where run_id=p_run and id=p_bake for update;
  select * into existing from mock_checkout_orders where id=p_id;
  if found then
    if existing.fingerprint<>p_fingerprint or existing.run_id<>p_run then raise exception 'attempt_conflict'; end if;
    return next existing; return;
  end if;
  update mock_bake_batches set reserved_oz=reserved_oz+p_ounces where run_id=p_run and id=p_bake and p_ounces>0 and reserved_oz+p_ounces<=capacity_oz;
  if not found then return; end if;
  return query insert into mock_checkout_orders(id,run_id,fingerprint,bake_id,ounces,snapshot) values(p_id,p_run,p_fingerprint,p_bake,p_ounces,p_snapshot) returning *;
end; $$;
create or replace function release_mock_order(p_id uuid) returns boolean language plpgsql as $$
declare b date; r uuid; w integer;
begin
  select bake_id,run_id into b,r from mock_checkout_orders where id=p_id;
  if b is null then return false; end if;
  perform 1 from mock_bake_batches where run_id=r and id=b for update;
  update mock_checkout_orders set status='released' where id=p_id and status in ('preparing','open') returning ounces into w;
  if w is null then return false; end if;
  update mock_bake_batches set reserved_oz=reserved_oz-w where run_id=r and id=b;
  return true;
end; $$;
