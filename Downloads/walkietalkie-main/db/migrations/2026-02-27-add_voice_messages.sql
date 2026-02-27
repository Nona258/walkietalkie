-- Migration: Create voice_messages table for stored voice recordings
create table if not exists public.voice_messages (
  id bigserial primary key,
  sender_id uuid null,
  recipient_id text null,
  file_url text not null,
  duration_ms integer null,
  created_at timestamp with time zone default now()
);

-- Optionally ensure sender_id references auth.users.id if desired
-- alter table public.voice_messages
--   add constraint voice_messages_sender_fkey foreign key (sender_id) references auth.users(id) on delete set null;
