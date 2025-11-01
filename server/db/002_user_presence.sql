-- User Presence Tracking for Real-time Collaboration
-- Safe to run multiple times

begin;

-- =====================
-- user_presence table
-- =====================

create table if not exists public.user_presence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null check (status in ('online', 'away', 'offline')),
  last_heartbeat timestamptz not null default now(),
  current_file text,
  current_activity text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraint: one presence record per user per team
create unique index if not exists user_presence_unique_idx
  on public.user_presence (user_id, team_id);

-- Index for efficient team-based queries
create index if not exists user_presence_team_idx
  on public.user_presence (team_id, status);

-- Index for heartbeat cleanup queries
create index if not exists user_presence_heartbeat_idx
  on public.user_presence (last_heartbeat);

-- Enable RLS
alter table public.user_presence enable row level security;

-- =====================
-- presence_notifications table
-- =====================
-- Track which notifications have been shown to avoid spam

create table if not exists public.presence_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  notified_about_user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('came_online', 'join_liveshare')),
  shown_at timestamptz not null default now(),
  dismissed boolean not null default false
);

-- Index for checking recent notifications
create index if not exists presence_notifications_lookup_idx
  on public.presence_notifications (user_id, team_id, notified_about_user_id, notification_type, shown_at);

-- Enable RLS
alter table public.presence_notifications enable row level security;

-- =====================
-- user_presence policies
-- =====================

-- Users can read presence of any team member
drop policy if exists presence_select on public.user_presence;
create policy presence_select
on public.user_presence
for select
to authenticated
using (
  auth.uid() is not null and public.is_team_member(public.user_presence.team_id)
);

-- Users can only insert their own presence
drop policy if exists presence_insert on public.user_presence;
create policy presence_insert
on public.user_presence
for insert
to authenticated
with check (
  auth.uid() is not null and user_id = auth.uid() and public.is_team_member(public.user_presence.team_id)
);

-- Users can only update their own presence
drop policy if exists presence_update on public.user_presence;
create policy presence_update
on public.user_presence
for update
to authenticated
using (
  auth.uid() is not null and user_id = auth.uid()
)
with check (
  auth.uid() is not null and user_id = auth.uid()
);

-- Users can delete their own presence
drop policy if exists presence_delete on public.user_presence;
create policy presence_delete
on public.user_presence
for delete
to authenticated
using (
  auth.uid() is not null and user_id = auth.uid()
);

-- =====================
-- presence_notifications policies
-- =====================

-- Users can read their own notifications
drop policy if exists notif_select on public.presence_notifications;
create policy notif_select
on public.presence_notifications
for select
to authenticated
using (
  auth.uid() is not null and user_id = auth.uid()
);

-- Users can insert their own notifications
drop policy if exists notif_insert on public.presence_notifications;
create policy notif_insert
on public.presence_notifications
for insert
to authenticated
with check (
  auth.uid() is not null and user_id = auth.uid()
);

-- Users can update their own notifications
drop policy if exists notif_update on public.presence_notifications;
create policy notif_update
on public.presence_notifications
for update
to authenticated
using (
  auth.uid() is not null and user_id = auth.uid()
)
with check (
  auth.uid() is not null and user_id = auth.uid()
);

-- =====================
-- Helper functions
-- =====================

-- Update presence heartbeat
create or replace function public.update_presence_heartbeat(
  p_team_id uuid,
  p_status text default 'online',
  p_current_file text default null,
  p_current_activity text default null
) returns public.user_presence
language plpgsql
security definer
set search_path = public
as $$
declare v_presence public.user_presence;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_team_member(p_team_id) then
    raise exception 'Not a team member';
  end if;

  insert into public.user_presence (user_id, team_id, status, last_heartbeat, current_file, current_activity)
  values (auth.uid(), p_team_id, p_status, now(), p_current_file, p_current_activity)
  on conflict (user_id, team_id) do update set
    status = excluded.status,
    last_heartbeat = now(),
    current_file = excluded.current_file,
    current_activity = excluded.current_activity,
    updated_at = now()
  returning * into v_presence;

  return v_presence;
end $$;

-- Get online team members
create or replace function public.get_online_team_members(p_team_id uuid)
returns table (
  user_id uuid,
  status text,
  last_heartbeat timestamptz,
  current_file text,
  current_activity text,
  github_username text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_team_member(p_team_id) then
    raise exception 'Not a team member';
  end if;

  -- Consider users online if heartbeat within last 90 seconds
  -- or status is explicitly 'online'
  return query
  select
    up.user_id,
    up.status,
    up.last_heartbeat,
    up.current_file,
    up.current_activity,
    (au.raw_user_meta_data->>'user_name')::text as github_username,
    (au.raw_user_meta_data->>'avatar_url')::text as avatar_url
  from public.user_presence up
  join auth.users au on up.user_id = au.id
  where up.team_id = p_team_id
    and up.user_id != auth.uid()  -- Exclude current user
    and (
      up.status = 'online'
      and up.last_heartbeat > now() - interval '90 seconds'
    )
  order by up.last_heartbeat desc;
end $$;

-- Mark user as offline
create or replace function public.set_presence_offline(p_team_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.user_presence
  set status = 'offline', updated_at = now()
  where user_id = auth.uid() and team_id = p_team_id;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end $$;

-- Check if notification was recently shown (within last 5 minutes)
create or replace function public.was_notification_shown_recently(
  p_team_id uuid,
  p_notified_about_user_id uuid,
  p_notification_type text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return exists (
    select 1 from public.presence_notifications
    where user_id = auth.uid()
      and team_id = p_team_id
      and notified_about_user_id = p_notified_about_user_id
      and notification_type = p_notification_type
      and shown_at > now() - interval '5 minutes'
  );
end $$;

-- Record that a notification was shown
create or replace function public.record_notification_shown(
  p_team_id uuid,
  p_notified_about_user_id uuid,
  p_notification_type text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.presence_notifications (user_id, team_id, notified_about_user_id, notification_type)
  values (auth.uid(), p_team_id, p_notified_about_user_id, p_notification_type)
  returning id into v_id;

  return v_id;
end $$;

-- Lock down function execute privileges
revoke all on function public.update_presence_heartbeat(uuid, text, text, text) from public;
revoke all on function public.get_online_team_members(uuid) from public;
revoke all on function public.set_presence_offline(uuid) from public;
revoke all on function public.was_notification_shown_recently(uuid, uuid, text) from public;
revoke all on function public.record_notification_shown(uuid, uuid, text) from public;

grant execute on function public.update_presence_heartbeat(uuid, text, text, text) to authenticated;
grant execute on function public.get_online_team_members(uuid) to authenticated;
grant execute on function public.set_presence_offline(uuid) to authenticated;
grant execute on function public.was_notification_shown_recently(uuid, uuid, text) to authenticated;
grant execute on function public.record_notification_shown(uuid, uuid, text) to authenticated;

-- =====================
-- Automatic cleanup trigger
-- =====================
-- Automatically mark users as offline if heartbeat is stale (>2 minutes)

create or replace function public.cleanup_stale_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_presence
  set status = 'offline', updated_at = now()
  where status != 'offline'
    and last_heartbeat < now() - interval '2 minutes';
end $$;

-- This function can be called periodically by a cron job or scheduled function
-- For now, we'll rely on client-side heartbeat timeout

commit;
