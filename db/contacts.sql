create table public.contacts (
  id bigserial not null,
  user_id uuid null,
  contact_id uuid null,
  created_at timestamp with time zone null default now(),
  constraint contacts_pkey primary key (id),
  constraint contacts_user_id_contact_id_key unique (user_id, contact_id),
  constraint contacts_contact_id_fkey foreign KEY (contact_id) references users (id) on delete CASCADE,
  constraint contacts_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;