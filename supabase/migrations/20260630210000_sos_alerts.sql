CREATE TYPE public.sos_status AS ENUM ('active', 'responding', 'resolved');

CREATE TABLE public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  message TEXT,
  status public.sos_status NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sos_alerts_status_idx ON public.sos_alerts(status) WHERE status = 'active';
CREATE INDEX sos_alerts_driver_idx ON public.sos_alerts(driver_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.sos_alerts TO authenticated;
GRANT ALL ON public.sos_alerts TO service_role;

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own SOS"
  ON public.sos_alerts FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers create SOS"
  ON public.sos_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins view all SOS"
  ON public.sos_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update SOS"
  ON public.sos_alerts FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER sos_alerts_set_updated_at
  BEFORE UPDATE ON public.sos_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER TABLE public.sos_alerts REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sos_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
  END IF;
END $$;
