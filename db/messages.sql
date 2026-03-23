create table public.messages (
  id bigserial not null,
  conversation_id uuid null,
  site_id uuid null,
  sender_id uuid not null,
  receiver_id uuid null,
  transcription text null,
  file_url text null,
  duration_ms integer null,
  created_at timestamp with time zone not null default now(),
  is_read character varying null,
  constraint messages_pkey primary key (id),
  constraint messages_conversation_id_fkey foreign KEY (conversation_id) references conversations (id) on delete CASCADE,
  constraint messages_receiver_id_fkey foreign KEY (receiver_id) references users (id) on delete set null,
  constraint messages_sender_id_fkey foreign KEY (sender_id) references users (id) on delete CASCADE,
  constraint messages_site_id_fkey foreign KEY (site_id) references sites (id),
  constraint messages_duration_nonneg check (
    (
      (duration_ms is null)
      or (duration_ms >= 0)
    )
  ),
  constraint messages_one_target check (
    (
      (
        ((conversation_id is not null))::integer + ((site_id is not null))::integer
      ) = 1
    )
  )
) TABLESPACE pg_default;