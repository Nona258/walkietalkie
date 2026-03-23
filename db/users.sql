create table public.users (
  id uuid not null,
  email text not null,
  full_name text not null,
  phone_number text null,
  role public.user_role not null default 'employee'::user_role,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  longitude double precision null,
  latitude double precision null,
  site_id uuid null,
  is_approved boolean null default false,
  status text null,
  profile_picture_url text null,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint users_site_id_fkey foreign KEY (site_id) references sites (id)
) TABLESPACE pg_default;

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();