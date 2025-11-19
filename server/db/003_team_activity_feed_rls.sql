-- RLS policies for team_activity_feed
-- Safe to run multiple times

begin;

-- Enable RLS on team_activity_feed
alter table if exists public.team_activity_feed enable row level security;

-- =====================
-- team_activity_feed policies
-- =====================

-- Team members can view activity for their team
drop policy if exists team_activity_feed_select on public.team_activity_feed;
create policy team_activity_feed_select
on public.team_activity_feed
for select
to authenticated
using (
  auth.uid() is not null and public.is_team_member(team_id)
);

-- Team members can insert activity for their team
drop policy if exists team_activity_feed_insert on public.team_activity_feed;
create policy team_activity_feed_insert
on public.team_activity_feed
for insert
to authenticated
with check (
  auth.uid() is not null and public.is_team_member(team_id)
);

-- Users can update their own activity entries (for editing summaries, etc.)
drop policy if exists team_activity_feed_update on public.team_activity_feed;
create policy team_activity_feed_update
on public.team_activity_feed
for update
to authenticated
using (
  auth.uid() is not null and (
    user_id = auth.uid() or public.is_team_admin(team_id)
  )
)
with check (
  auth.uid() is not null and (
    user_id = auth.uid() or public.is_team_admin(team_id)
  )
);

-- Team admins can delete activity entries
drop policy if exists team_activity_feed_delete on public.team_activity_feed;
create policy team_activity_feed_delete
on public.team_activity_feed
for delete
to authenticated
using (
  auth.uid() is not null and public.is_team_admin(team_id)
);

commit;
