-- Create team_jira_configs table for Jira integration
-- Safe to run multiple times

begin;

-- Create table for storing Jira configurations per team
create table if not exists public.team_jira_configs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  jira_url text not null,
  jira_project_key text not null,
  access_token text not null, -- Base64 encoded email:api_token for Jira Basic Auth
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Ensure only one Jira config per team
  unique(team_id)
);

-- Create index for faster lookups
create index if not exists team_jira_configs_team_id_idx on public.team_jira_configs(team_id);

-- Enable RLS
alter table public.team_jira_configs enable row level security;

-- =====================
-- team_jira_configs policies
-- =====================

-- Anyone on the team can view the Jira config (needed to fetch issues)
drop policy if exists jira_config_select on public.team_jira_configs;
create policy jira_config_select
on public.team_jira_configs
for select
to authenticated
using (
  auth.uid() is not null and public.is_team_member(team_id)
);

-- Only team admins can insert Jira configs
drop policy if exists jira_config_insert on public.team_jira_configs;
create policy jira_config_insert
on public.team_jira_configs
for insert
to authenticated
with check (
  auth.uid() is not null and public.is_team_admin(team_id)
);

-- Only team admins can update Jira configs
drop policy if exists jira_config_update on public.team_jira_configs;
create policy jira_config_update
on public.team_jira_configs
for update
to authenticated
using (
  auth.uid() is not null and public.is_team_admin(team_id)
)
with check (
  auth.uid() is not null and public.is_team_admin(team_id)
);

-- Only team admins can delete Jira configs
drop policy if exists jira_config_delete on public.team_jira_configs;
create policy jira_config_delete
on public.team_jira_configs
for delete
to authenticated
using (
  auth.uid() is not null and public.is_team_admin(team_id)
);

-- =====================
-- Trigger to update updated_at timestamp
-- =====================
create or replace function public.update_team_jira_configs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists update_jira_configs_updated_at on public.team_jira_configs;
create trigger update_jira_configs_updated_at
before update on public.team_jira_configs
for each row execute function public.update_team_jira_configs_updated_at();

commit;
