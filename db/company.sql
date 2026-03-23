create table public.company (
  id bigserial not null,
  company_name text not null,
  industry_or_sectors text null,
  no_of_branch integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint company_pkey primary key (id)
) TABLESPACE pg_default;

create unique INDEX IF not exists company_company_name_uq on public.company using btree (company_name) TABLESPACE pg_default;