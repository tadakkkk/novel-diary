-- Usage tracking table (Paddle 기반)
-- Supabase SQL Editor에서 실행

create table if not exists usage (
  user_id                text primary key,
  call_count             integer not null default 0,
  subscription_status    text not null default 'free'
                           check (subscription_status in ('free','active','canceled','past_due')),
  subscription_plan      text check (subscription_plan in ('weekly','monthly')),
  paddle_customer_id     text unique,
  paddle_subscription_id text unique,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists usage_updated_at on usage;
create trigger usage_updated_at
  before update on usage
  for each row execute function update_updated_at();

-- RLS: 서버는 service_role 키로 접근 (RLS 우회)
-- 클라이언트에서 이 테이블에 직접 접근하지 않음
alter table usage enable row level security;
