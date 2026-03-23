create table public.conversations (
  id uuid not null default gen_random_uuid (),
  user_one uuid null,
  user_two uuid null,
  created_at timestamp with time zone null default now(),
  constraint conversations_pkey primary key (id),
  constraint conversations_user_one_user_two_key unique (user_one, user_two),
  constraint conversations_user_one_fkey foreign KEY (user_one) references users (id) on delete CASCADE,
  constraint conversations_user_two_fkey foreign KEY (user_two) references users (id) on delete CASCADE
) TABLESPACE pg_default;