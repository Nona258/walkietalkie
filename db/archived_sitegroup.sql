create table public.archived_sitegroup (
  id uuid not null,
  name character varying(50) not null,
  status character varying(20) not null,
  created_at timestamp with time zone null,
  updated_at timestamp with time zone null,
  latitude double precision null,
  longitude double precision null,
  company_id integer null,
  branch_id integer null,
  start_time time without time zone null,
  end_time time without time zone null,
  date_accomplished date null,
  members_count integer null,
  starlink_serial text null,
  technical_issue text null,
  issue_description text null,
  evidence_urls text[] not null default '{}'::text[],
  finished_by uuid null,
  finished_at timestamp with time zone null,
  leader_id uuid null,
  constraint archived_sitegroup_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_archived_sitegroup_company_id on public.archived_sitegroup using btree (company_id) TABLESPACE pg_default;

create index IF not exists idx_archived_sitegroup_branch_id on public.archived_sitegroup using btree (branch_id) TABLESPACE pg_default;

create index IF not exists idx_archived_sitegroup_date_accomplished on public.archived_sitegroup using btree (date_accomplished) TABLESPACE pg_default;

create unique INDEX IF not exists unique_archived_sitegroup_name on public.archived_sitegroup using btree (lower((name)::text)) TABLESPACE pg_default;