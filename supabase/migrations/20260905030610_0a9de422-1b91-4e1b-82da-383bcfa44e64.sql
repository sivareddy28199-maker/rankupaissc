-- Prevent authenticated users from changing their own plan_tier (privilege escalation guard).
-- Only the service role (backend) may modify plan_tier.

CREATE OR REPLACE FUNCTION public.protect_plan_tier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier
     AND current_setting('request.jwt.claims', true) IS NOT NULL
     AND COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'plan_tier can only be changed by the server';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_plan_tier ON public.profiles;
CREATE TRIGGER profiles_protect_plan_tier
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_tier();

-- Defense in depth: strip column-level update rights from client roles so
-- even direct PostgREST PATCH attempts on plan_tier are rejected.
REVOKE UPDATE (plan_tier) ON public.profiles FROM authenticated;
REVOKE UPDATE (plan_tier) ON public.profiles FROM anon;