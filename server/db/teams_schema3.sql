BEGIN;

-- 1) Ensure RLS is enabled on both tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_membership ENABLE ROW LEVEL SECURITY;

-- 2) Drop legacy/conflicting policies if they exist
-- (These names match prior iterations/screenshots; if some don't exist that's fine.)
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team admins can update team details" ON public.teams;
DROP POLICY IF EXISTS "Team admins can delete teams" ON public.teams;

DROP POLICY IF EXISTS "Users can view memberships for their teams" ON public.team_membership;
DROP POLICY IF EXISTS "Users can join teams" ON public.team_membership;
DROP POLICY IF EXISTS "Team admins can manage memberships" ON public.team_membership;
DROP POLICY IF EXISTS "Users can leave teams or admins can remove members" ON public.team_membership;

-- Also drop our v2 policy names if re-running
DROP POLICY IF EXISTS "Teams: select if member" ON public.teams;
DROP POLICY IF EXISTS "Teams: insert if creator is self" ON public.teams;
DROP POLICY IF EXISTS "Teams: update if creator or admin" ON public.teams;
DROP POLICY IF EXISTS "Teams: delete if creator or admin" ON public.teams;
DROP POLICY IF EXISTS "Teams: select for authenticated" ON public.teams;

DROP POLICY IF EXISTS "Membership: select own rows" ON public.team_membership;
DROP POLICY IF EXISTS "Membership: insert self" ON public.team_membership;
DROP POLICY IF EXISTS "Membership: delete own row" ON public.team_membership;
DROP POLICY IF EXISTS "Membership: creator can update" ON public.team_membership;
DROP POLICY IF EXISTS "Membership: creator can delete" ON public.team_membership;

-- 3) Create new, non-recursive policies
-- Teams
-- Users can read teams if they are members (safe: references team_membership from teams policy only)
CREATE POLICY "Teams: select if member" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.team_membership tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
  );

-- Allow anyone authenticated to create a team for themselves
CREATE POLICY "Teams: insert if creator is self" ON public.teams
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Allow updates if the acting user is the creator OR an 'admin' member
CREATE POLICY "Teams: update if creator or admin" ON public.teams
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.team_membership tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- Allow deletes if the acting user is the creator OR an 'admin' member (adjust to your needs)
CREATE POLICY "Teams: delete if creator or admin" ON public.teams
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.team_membership tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- IMPORTANT: Your extension currently selects a team by join_code BEFORE membership exists.
-- RLS cannot see query parameters, so the strict policy above would block that.
-- To keep your current flow working without code changes, we temporarily allow
-- all authenticated users to SELECT teams. Consider replacing this later with
-- the RPC below and removing this policy for tighter security.
-- Removed broad select policy now that the extension uses RPC for join-by-code.
-- If you must restore it temporarily, uncomment below and re-run this script.
-- CREATE POLICY "Teams: select for authenticated" ON public.teams
--   FOR SELECT TO authenticated USING (true);

-- Team membership (NO self-reference to avoid recursion)
-- Users can read their own membership rows
CREATE POLICY "Membership: select own rows" ON public.team_membership
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert a membership only for themselves (join/creator)
CREATE POLICY "Membership: insert self" ON public.team_membership
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own membership (leave team)
CREATE POLICY "Membership: delete own row" ON public.team_membership
  FOR DELETE USING (user_id = auth.uid());

-- Team creator can update/delete any membership in their team (no recursion: join via teams)
CREATE POLICY "Membership: creator can update" ON public.team_membership
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_membership.team_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Membership: creator can delete" ON public.team_membership
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_membership.team_id AND t.created_by = auth.uid()
    )
  );

-- 4) (Optional, recommended) RPC for secure join-by-code lookup
-- This lets you remove the broad "Teams: select for authenticated" policy above.
-- After deploying this RPC, change your client to call:
--   supabase.rpc('get_team_by_join_code', { p_join_code: joinCode })
-- instead of selecting directly from teams by join_code.

-- Drop and re-create function idempotently
DROP FUNCTION IF EXISTS public.get_team_by_join_code(text);
CREATE OR REPLACE FUNCTION public.get_team_by_join_code(p_join_code text)
RETURNS SETOF public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Require authenticated users
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT t.*
  FROM public.teams t
  WHERE t.join_code = UPPER(p_join_code);
END;
$$;

-- Ensure typical roles can execute the RPC
GRANT EXECUTE ON FUNCTION public.get_team_by_join_code(text) TO anon, authenticated;

COMMIT;