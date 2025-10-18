DROP FUNCTION IF EXISTS public.get_team_by_join_code(text);

CREATE OR REPLACE FUNCTION public.get_team_by_join_code(p_join_code text)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  result public.teams%ROWTYPE;
BEGIN
  -- Allow authenticated, anon, or service_role
  IF auth.role() NOT IN ('authenticated', 'service_role', 'anon') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT t.* INTO result
  FROM public.teams t
  WHERE t.join_code = UPPER(p_join_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_by_join_code(text) TO anon, authenticated;