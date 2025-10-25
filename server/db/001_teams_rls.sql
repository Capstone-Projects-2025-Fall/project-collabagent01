-- Strong RLS for teams and team_membership
-- Safe to run multiple times

begin;

-- Ensure pgcrypto is available (Supabase installs extensions in the "extensions" schema)
create extension if not exists pgcrypto with schema extensions;

-- Postgres doesn't support IF NOT EXISTS for ADD CONSTRAINT; use unique index instead
create unique index if not exists team_membership_unique_idx
  on public.team_membership (team_id, user_id);

-- Enable RLS
alter table if exists public.teams enable row level security;
alter table if exists public.team_membership enable row level security;

-- =====================
-- helper functions to avoid policy self-recursion
-- =====================

-- Check if current user is a member of a team
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_membership tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
  );
$$;

-- Check if current user is an admin of a team
create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_membership tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid() and tm.role = 'admin'
  );
$$;

-- Lock down helper function execution
revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_admin(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_admin(uuid) to authenticated;

-- =====================
-- teams policies
-- =====================

drop policy if exists teams_select on public.teams;
create policy teams_select
on public.teams
for select
to authenticated
using (
  auth.uid() is not null and public.is_team_member(public.teams.id)
);

-- Only allow creating a team for oneself
drop policy if exists teams_insert on public.teams;
create policy teams_insert
on public.teams
for insert
to authenticated
with check (auth.uid() is not null and created_by = auth.uid());

-- Allow updates by creator or admins
drop policy if exists teams_update on public.teams;
create policy teams_update
on public.teams
for update
to authenticated
using (
  auth.uid() is not null and (
    created_by = auth.uid() or public.is_team_admin(public.teams.id)
  )
)
with check (
  auth.uid() is not null and (
    created_by = auth.uid() or public.is_team_admin(public.teams.id)
  )
);

-- Only creator can delete a team (adjust if you want admins too)
-- Allow delete by creator or any admin of the team
drop policy if exists teams_delete on public.teams;
create policy teams_delete
on public.teams
for delete
to authenticated
using (
  auth.uid() is not null and (
    created_by = auth.uid() or public.is_team_admin(public.teams.id)
  )
);

-- =====================
-- team_membership policies
-- =====================

drop policy if exists tm_select on public.team_membership;
create policy tm_select
on public.team_membership
for select
to authenticated
using (
  auth.uid() is not null and (
    user_id = auth.uid() or public.is_team_admin(public.team_membership.team_id) or exists (
      select 1 from public.teams t where t.id = public.team_membership.team_id and t.created_by = auth.uid()
    )
  )
);

-- Block direct inserts; use RPC to join
-- (Keep this as the only insert policy to force RPC path)
drop policy if exists tm_insert_block_all on public.team_membership;
create policy tm_insert_block_all
on public.team_membership
for insert
to authenticated
with check (false);

-- Admin/owner can update roles
drop policy if exists tm_update_admin_only on public.team_membership;
create policy tm_update_admin_only
on public.team_membership
for update
to authenticated
using (
  auth.uid() is not null and public.is_team_admin(public.team_membership.team_id)
)
with check (
  auth.uid() is not null and public.is_team_admin(public.team_membership.team_id)
);

-- User can delete their own membership (leave team); admins can also manage
-- (No separate self-leave RPC needed)
drop policy if exists tm_delete_self_or_admin on public.team_membership;
create policy tm_delete_self_or_admin
on public.team_membership
for delete
to authenticated
using (
  auth.uid() is not null and (
    user_id = auth.uid() or public.is_team_admin(public.team_membership.team_id)
  )
);

-- =====================
-- RPCs (security definer)
-- =====================

create or replace function public.create_team(
  p_lobby_name text,
  p_project_name text,
  p_project_identifier text,
  p_project_repo_url text default null
) returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare v_team public.teams;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Generate 6-char uppercase hex code (A-F0-9) to match UI expectations
  insert into public.teams (lobby_name, project_name, project_identifier, project_repo_url, created_by, join_code)
  values (p_lobby_name, p_project_name, p_project_identifier, p_project_repo_url, auth.uid(), substring(upper(encode(extensions.gen_random_bytes(6), 'hex')) from 1 for 6))
  returning * into v_team;

  insert into public.team_membership (team_id, user_id, role)
  values (v_team.id, auth.uid(), 'admin')
  on conflict (team_id, user_id) do nothing;

  return v_team;
end $$;

create or replace function public.join_team_by_code(p_join_code text)
returns public.team_membership
language plpgsql
security definer
set search_path = public
as $$
declare v_team_id uuid;
        v_membership public.team_membership;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_team_id from public.teams where join_code = upper(p_join_code);
  if v_team_id is null then
    raise exception 'Invalid code';
  end if;

  insert into public.team_membership (team_id, user_id, role)
  values (v_team_id, auth.uid(), 'member')
  on conflict (team_id, user_id) do update set joined_at = now()
  returning * into v_membership;

  return v_membership;
end $$;

-- Read-only RPC to fetch a team by join code for pre-join validation (AgentPanel)
create or replace function public.get_team_by_join_code(p_join_code text)
returns public.teams
language sql
security definer
set search_path = public
as $$
  select * from public.teams where join_code = upper(p_join_code) limit 1;
$$;

-- Lock down function execute privileges
revoke all on function public.create_team(text, text, text, text) from public;
revoke all on function public.join_team_by_code(text) from public;
revoke all on function public.get_team_by_join_code(text) from public;
grant execute on function public.create_team(text, text, text, text) to authenticated;
grant execute on function public.join_team_by_code(text) to authenticated;
grant execute on function public.get_team_by_join_code(text) to authenticated;

-- =====================
-- Protect immutable columns on teams
-- =====================
create or replace function public.protect_teams_immutable()
returns trigger language plpgsql as $$
begin
  new.id := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists protect_immutable on public.teams;
create trigger protect_immutable
before update on public.teams
for each row execute function public.protect_teams_immutable();

-- =====================
-- Admin/creator team deletion RPC (avoids RLS no-op deletes)
-- =====================
create or replace function public.delete_team(p_team_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_deleted integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Only team creator or any admin of the team can delete
  select (
    exists (select 1 from public.teams t where t.id = p_team_id and t.created_by = auth.uid())
    or public.is_team_admin(p_team_id)
  ) into v_allowed;

  if not v_allowed then
    raise exception 'Not authorized to delete this team';
  end if;

  -- Remove memberships then team
  delete from public.team_membership where team_id = p_team_id;
  delete from public.teams where id = p_team_id;
  get diagnostics v_deleted = row_count;

  return v_deleted > 0;
end $$;

revoke all on function public.delete_team(uuid) from public;
grant execute on function public.delete_team(uuid) to authenticated;

-- =====================
-- Self-leave RPC for members
-- =====================
create or replace function public.leave_team(p_team_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.team_membership
  where team_id = p_team_id and user_id = auth.uid();
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end $$;

revoke all on function public.leave_team(uuid) from public;
grant execute on function public.leave_team(uuid) to authenticated;

commit;