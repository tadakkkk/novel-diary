-- Usage tracking table
-- Run this in Supabase SQL Editor

create table if not exists usage (
  user_id               text primary key,
  call_count            integer not null default 0,
  subscription_status   text not null default 'free'
                          check (subscription_status in ('free','active','canceled','past_due')),
  subscription_plan     text check (subscription_plan in ('weekly','monthly')),
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger usage_updated_at
  before update on usage
  for each row execute function update_updated_at();

-- Row Level Security: server uses service role key (bypasses RLS)
-- Client never accesses this table directly
alter table usage enable row level security;
