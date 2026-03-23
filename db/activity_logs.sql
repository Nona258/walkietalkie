create table public.activity_logs (
  id bigserial not null,
  user_name text not null,
  initials text null,
  action text not null,
  description text null,
  location text null,
  time timestamp with time zone not null default now(),
  type text null,
  color text null,
  icon text null,
  constraint activity_logs_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists activity_logs_time_idx on public.activity_logs using btree ("time" desc) TABLESPACE pg_default;