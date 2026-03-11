-- Migration: Contact Management schema (contacts, conversations, groups, messages)
-- Designed to match usage in:
--  - pages/admin/ContactManagement.tsx
--  - pages/employee/Contacts.tsx
--  - pages/employee/Chat.tsx
--  - pages/employee/SiteDetails.tsx

-- UUID helper (Supabase typically has this already, but keep it safe)
create extension if not exists pgcrypto;

-- Helper to allow admin-only actions in RLS policies.
-- Uses public.users.role (expects values like 'admin', 'administrator', etc.).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and lower(coalesce(u.role, '')) like '%admin%'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Groups + membership
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_id uuid null,
  leader_id uuid null,
  created_at timestamp with time zone not null default now()
);

-- Add FKs in a safe/conditional way (constraints can't be IF NOT EXISTS)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='sites') then
    if not exists (
      select 1 from pg_constraint
      where conname = 'groups_site_id_fkey'
    ) then
      alter table public.groups
        add constraint groups_site_id_fkey
        foreign key (site_id) references public.sites(id) on delete set null;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='users') then
    if not exists (
      select 1 from pg_constraint
      where conname = 'groups_leader_id_fkey'
    ) then
      alter table public.groups
        add constraint groups_leader_id_fkey
        foreign key (leader_id) references public.users(id) on delete set null;
    end if;
  end if;
end $$;

create index if not exists idx_groups_site_id on public.groups using btree (site_id);
create index if not exists idx_groups_leader_id on public.groups using btree (leader_id);

-- Enforce 1 group per site and 1 leader per group (matches UI safety checks)
create unique index if not exists ux_groups_site_id on public.groups(site_id) where site_id is not null;
create unique index if not exists ux_groups_leader_id on public.groups(leader_id) where leader_id is not null;

create table if not exists public.group_members (
  id bigserial primary key,
  group_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint group_members_unique unique (group_id, user_id)
);

-- Add FKs conditionally
 do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'group_members_group_id_fkey'
  ) then
    alter table public.group_members
      add constraint group_members_group_id_fkey
      foreign key (group_id) references public.groups(id) on delete cascade;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='users') then
    if not exists (
      select 1 from pg_constraint
      where conname = 'group_members_user_id_fkey'
    ) then
      alter table public.group_members
        add constraint group_members_user_id_fkey
        foreign key (user_id) references public.users(id) on delete cascade;
    end if;
  end if;
end $$;

create index if not exists idx_group_members_user_id on public.group_members using btree (user_id);
create index if not exists idx_group_members_group_id on public.group_members using btree (group_id);

-- Link users -> groups to support PostgREST joins like: group:group_id ( id, name )
-- Used in pages/employee/Contacts.tsx and pages/employee/SiteDetails.tsx
alter table public.users
  add column if not exists group_id uuid null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_group_id_fkey'
  ) then
    alter table public.users
      add constraint users_group_id_fkey
      foreign key (group_id) references public.groups(id) on delete set null;
  end if;
end $$;

create index if not exists idx_users_group_id on public.users using btree (group_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Contacts (direct contacts list)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id bigserial primary key,
  user_id uuid not null,
  contact_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint contacts_not_self check (user_id <> contact_id),
  constraint contacts_unique unique (user_id, contact_id)
);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='users') then
    if not exists (
      select 1 from pg_constraint
      where conname = 'contacts_user_id_fkey'
    ) then
      alter table public.contacts
        add constraint contacts_user_id_fkey
        foreign key (user_id) references public.users(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'contacts_contact_id_fkey'
    ) then
      alter table public.contacts
        add constraint contacts_contact_id_fkey
        foreign key (contact_id) references public.users(id) on delete cascade;
    end if;
  end if;
end $$;

create index if not exists idx_contacts_user_id on public.contacts using btree (user_id);
create index if not exists idx_contacts_contact_id on public.contacts using btree (contact_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Conversations (1:1)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null,
  user_two uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint conversations_not_self check (user_one <> user_two)
);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='users') then
    if not exists (
      select 1 from pg_constraint
      where conname = 'conversations_user_one_fkey'
    ) then
      alter table public.conversations
        add constraint conversations_user_one_fkey
        foreign key (user_one) references public.users(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'conversations_user_two_fkey'
    ) then
      alter table public.conversations
        add constraint conversations_user_two_fkey
        foreign key (user_two) references public.users(id) on delete cascade;
    end if;
  end if;
end $$;

-- Enforce uniqueness regardless of user ordering
create unique index if not exists ux_conversations_pair
  on public.conversations (least(user_one, user_two), greatest(user_one, user_two));

create index if not exists idx_conversations_user_one on public.conversations using btree (user_one);
create index if not exists idx_conversations_user_two on public.conversations using btree (user_two);

-- ─────────────────────────────────────────────────────────────────────────────
-- Messages (direct + group)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id bigserial primary key,
  conversation_id uuid null,
  group_id uuid null,
  sender_id uuid not null,
  receiver_id uuid null,
  transcription text null,
  file_url text null,
  duration_ms integer null,
  created_at timestamp with time zone not null default now(),
  constraint messages_one_target check (((conversation_id is not null)::int + (group_id is not null)::int) = 1),
  constraint messages_duration_nonneg check (duration_ms is null or duration_ms >= 0)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_conversation_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_conversation_id_fkey
      foreign key (conversation_id) references public.conversations(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_group_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_group_id_fkey
      foreign key (group_id) references public.groups(id) on delete cascade;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='users') then
    if not exists (
      select 1 from pg_constraint
      where conname = 'messages_sender_id_fkey'
    ) then
      alter table public.messages
        add constraint messages_sender_id_fkey
        foreign key (sender_id) references public.users(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'messages_receiver_id_fkey'
    ) then
      alter table public.messages
        add constraint messages_receiver_id_fkey
        foreign key (receiver_id) references public.users(id) on delete set null;
    end if;
  end if;
end $$;

create index if not exists idx_messages_conversation_created_at on public.messages using btree (conversation_id, created_at);
create index if not exists idx_messages_group_created_at on public.messages using btree (group_id, created_at);
create index if not exists idx_messages_sender_id on public.messages using btree (sender_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants (required for Supabase PostgREST roles)
-- Note: RLS policies still gate access; these grants only allow the roles to try.
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema public to authenticated;

grant select, insert, delete on public.contacts to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert on public.messages to authenticated;

-- Allow bigint/serial ids to be generated when inserting.
grant usage, select on all sequences in schema public to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (Supabase)
-- ─────────────────────────────────────────────────────────────────────────────

-- contacts
alter table public.contacts enable row level security;

drop policy if exists contacts_select_own on public.contacts;
create policy contacts_select_own
on public.contacts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists contacts_insert_own on public.contacts;
create policy contacts_insert_own
on public.contacts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists contacts_delete_own on public.contacts;
create policy contacts_delete_own
on public.contacts
for delete
to authenticated
using (user_id = auth.uid());

-- conversations
alter table public.conversations enable row level security;

drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants
on public.conversations
for select
to authenticated
using (auth.uid() = user_one or auth.uid() = user_two);

drop policy if exists conversations_insert_participants on public.conversations;
create policy conversations_insert_participants
on public.conversations
for insert
to authenticated
with check (auth.uid() = user_one or auth.uid() = user_two);

-- groups
alter table public.groups enable row level security;

drop policy if exists groups_select_authenticated on public.groups;
create policy groups_select_authenticated
on public.groups
for select
to authenticated
using (true);

drop policy if exists groups_insert_admin_or_leader on public.groups;
create policy groups_insert_admin_or_leader
on public.groups
for insert
to authenticated
with check (public.is_admin(auth.uid()) or leader_id = auth.uid());

drop policy if exists groups_update_admin_or_leader on public.groups;
create policy groups_update_admin_or_leader
on public.groups
for update
to authenticated
using (public.is_admin(auth.uid()) or leader_id = auth.uid())
with check (public.is_admin(auth.uid()) or leader_id = auth.uid());

drop policy if exists groups_delete_admin on public.groups;
create policy groups_delete_admin
on public.groups
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- group_members
alter table public.group_members enable row level security;

drop policy if exists group_members_select_member_or_admin on public.group_members;
create policy group_members_select_member_or_admin
on public.group_members
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or user_id = auth.uid()
  or group_id in (
    select gm2.group_id
    from public.group_members gm2
    where gm2.user_id = auth.uid()
  )
);

drop policy if exists group_members_insert_self_or_admin on public.group_members;
create policy group_members_insert_self_or_admin
on public.group_members
for insert
to authenticated
with check (public.is_admin(auth.uid()) or user_id = auth.uid());

drop policy if exists group_members_delete_self_or_admin on public.group_members;
create policy group_members_delete_self_or_admin
on public.group_members
for delete
to authenticated
using (public.is_admin(auth.uid()) or user_id = auth.uid());

-- messages
alter table public.messages enable row level security;

drop policy if exists messages_select_participant_or_group_member on public.messages;
create policy messages_select_participant_or_group_member
on public.messages
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or (
    conversation_id is not null
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.user_one or auth.uid() = c.user_two)
    )
  )
  or (
    group_id is not null
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = messages.group_id
        and gm.user_id = auth.uid()
    )
  )
);

drop policy if exists messages_insert_sender_and_allowed on public.messages;
create policy messages_insert_sender_and_allowed
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.is_admin(auth.uid())
    or (
      conversation_id is not null
      and exists (
        select 1
        from public.conversations c
        where c.id = messages.conversation_id
          and (auth.uid() = c.user_one or auth.uid() = c.user_two)
      )
    )
    or (
      group_id is not null
      and exists (
        select 1
        from public.group_members gm
        where gm.group_id = messages.group_id
          and gm.user_id = auth.uid()
      )
    )
  )
);
