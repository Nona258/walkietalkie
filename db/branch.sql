create table public.branch (
  id bigserial not null,
  branch_name text not null,
  company_id bigint not null,
  created_at timestamp with time zone not null default now(),
  longitude double precision null,
  latitude double precision null,
  constraint branch_pkey primary key (id),
  constraint branch_company_id_fkey foreign KEY (company_id) references company (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists branch_company_id_idx on public.branch using btree (company_id) TABLESPACE pg_default;