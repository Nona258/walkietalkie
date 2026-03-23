create table public.eula_acceptance (
  id bigserial not null,
  user_id uuid null,
  accepted_at timestamp with time zone null,
  constraint eula_acceptance_pkey primary key (id),
  constraint eula_acceptance_user_id_key unique (user_id),
  constraint eula_acceptance_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;