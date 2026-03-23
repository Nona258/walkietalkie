create table public.sites (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(50) not null,
  status character varying(20) not null default 'Active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
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
  constraint sites_pkey primary key (id),
  constraint sites_company_id_fkey foreign KEY (company_id) references company (id) on delete RESTRICT,
  constraint sites_finished_by_fkey foreign KEY (finished_by) references users (id) on delete set null,
  constraint sites_leader_id_fkey foreign KEY (leader_id) references users (id),
  constraint sites_branch_id_fkey foreign KEY (branch_id) references branch (id) on delete RESTRICT,
  constraint sites_members_count_check check (
    (
      (members_count is null)
      or (members_count >= 0)
    )
  ),
  constraint sites_finish_requirements_check check (
    (
      ((status)::text <> 'Finished'::text)
      or (
        (date_accomplished is not null)
        and (finished_at is not null)
        and (finished_by is not null)
        and (starlink_serial is not null)
        and (length(btrim(starlink_serial)) > 0)
        and (technical_issue is not null)
        and (length(btrim(technical_issue)) > 0)
        and (issue_description is not null)
        and (length(btrim(issue_description)) > 0)
        and (array_length(evidence_urls, 1) > 0)
      )
    )
  ) not VALID,
  constraint sites_status_check check (
    (
      (status)::text = any (
        (
          array[
            'Active'::character varying,
            'Pending'::character varying,
            'Finished'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_sites_company_id on public.sites using btree (company_id) TABLESPACE pg_default;

create index IF not exists idx_sites_branch_id on public.sites using btree (branch_id) TABLESPACE pg_default;

create unique INDEX IF not exists unique_site_name on public.sites using btree (lower((name)::text)) TABLESPACE pg_default;

create index IF not exists idx_sites_date_accomplished on public.sites using btree (date_accomplished) TABLESPACE pg_default;

create trigger trg_archive_group_on_site_finished
after
update OF status on sites for EACH row when (
  old.status::text is distinct from new.status::text
)
execute FUNCTION archive_group_on_site_finished ();

create trigger trg_restore_group_on_site_reopened
after
update OF status on sites for EACH row when (
  old.status::text is distinct from new.status::text
)
execute FUNCTION restore_group_on_site_reopened ();