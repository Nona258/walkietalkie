-- Records user movement whenever users.latitude/longitude changes

create table if not exists public.user_location_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  status text null,
  recorded_at timestamp with time zone not null default now()
);

create index if not exists user_location_history_user_id_recorded_at_idx
  on public.user_location_history (user_id, recorded_at desc);

create index if not exists user_location_history_recorded_at_idx
  on public.user_location_history (recorded_at desc);

alter table public.user_location_history enable row level security;

-- Users can read their own history
drop policy if exists "Read own location history" on public.user_location_history;
create policy "Read own location history"
  on public.user_location_history
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admins can read all history
drop policy if exists "Admin read all location history" on public.user_location_history;
create policy "Admin read all location history"
  on public.user_location_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );

-- Users can insert their own history (optional; trigger below also logs movement)
drop policy if exists "Insert own location history" on public.user_location_history;
create policy "Insert own location history"
  on public.user_location_history
  for insert
  to authenticated
  with check (user_id = auth.uid());

create or replace function public.log_user_location_change()
returns trigger
language plpgsql
as $$
begin
  -- Only log when lat/lng are present and changed
  if new.latitude is null or new.longitude is null then
    return new;
  end if;

  if (new.latitude is distinct from old.latitude)
     or (new.longitude is distinct from old.longitude)
     or (new.status is distinct from old.status) then

    insert into public.user_location_history (user_id, latitude, longitude, status, recorded_at)
    values (new.id, new.latitude, new.longitude, new.status, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_user_location_change on public.users;

create trigger trg_log_user_location_change
after update of latitude, longitude, status on public.users
for each row
execute function public.log_user_location_change();
