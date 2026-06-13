
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by owner or admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT id, full_name, avatar_url, rating, created_at
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO authenticated;

DROP POLICY IF EXISTS "Drivers publicly visible" ON public.drivers;
CREATE POLICY "Drivers viewable by owner or admin"
  ON public.drivers FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.drivers_public
WITH (security_invoker=on) AS
SELECT id, fleet_id, license_category, is_verified, is_online, rating, total_trips, bio, created_at
FROM public.drivers;
GRANT SELECT ON public.drivers_public TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['rides','drivers','messages','carpool_bookings']) LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END$$;
