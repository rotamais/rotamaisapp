-- ============ NOTIFICATIONS ============
CREATE TYPE public.notification_type AS ENUM (
  'ride_request',
  'ride_accepted',
  'ride_started',
  'ride_completed',
  'ride_cancelled',
  'driver_arrived',
  'payment_received',
  'payment_failed',
  'withdrawal_status',
  'document_verified',
  'document_rejected',
  'driver_approved',
  'driver_suspended',
  'promotion',
  'system'
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  reference_id UUID,
  reference_type TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System creates notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications as read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function: create notification (called by triggers or server)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data, reference_id, reference_type)
  VALUES (p_user_id, p_type, p_title, p_body, p_data, p_reference_id, p_reference_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_notification FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated, service_role;

-- Trigger: notify passenger when driver accepts ride
CREATE OR REPLACE FUNCTION public.notify_ride_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'requested' AND NEW.driver_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.passenger_id,
      'ride_accepted',
      'Corrida aceita',
      'Um motorista aceitou sua corrida e está a caminho.',
      jsonb_build_object('ride_id', NEW.id, 'driver_id', NEW.driver_id),
      NEW.id,
      'ride'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_ride_accepted_trigger
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status = 'requested' AND NEW.driver_id IS NOT NULL)
  EXECUTE FUNCTION public.notify_ride_accepted();

-- Trigger: notify driver when passenger cancels
CREATE OR REPLACE FUNCTION public.notify_ride_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND OLD.driver_id IS NOT NULL THEN
    PERFORM public.create_notification(
      OLD.driver_id,
      'ride_cancelled',
      'Corrida cancelada',
      'O passageiro cancelou a corrida.',
      jsonb_build_object('ride_id', NEW.id),
      NEW.id,
      'ride'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_ride_cancelled_trigger
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION public.notify_ride_cancelled();

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ============ SAVED PLACES ============
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  icon TEXT DEFAULT 'home',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, label)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_places TO authenticated;
GRANT ALL ON public.saved_places TO service_role;

ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved places"
  ON public.saved_places FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER saved_places_set_updated_at
  BEFORE UPDATE ON public.saved_places
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
