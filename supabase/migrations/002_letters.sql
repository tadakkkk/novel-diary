-- Letters table: server-side letter storage for "다음 챕터" feature
create table if not exists letters (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,          -- auth user id ('uuid') or anon device id ('anon:xxx')
  date          text not null,          -- 'YYYY-MM-DD' — which day's letter
  content       text not null,
  scheduled_at  timestamptz not null,   -- gated delivery time (random 0–6 am next calendar day)
  is_read       boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists letters_user_date_idx on letters (user_id, date);
