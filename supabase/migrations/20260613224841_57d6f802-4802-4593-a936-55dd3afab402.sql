
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS suspended_reason text;

-- allow admins to update profiles / drivers (in addition to existing self-update)
DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- platform settings (singleton)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads platform settings" ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage platform settings" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER platform_settings_set_updated_at BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.platform_settings (platform_fee_percent) SELECT 20.00 WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- driver withdrawals
CREATE TABLE IF NOT EXISTS public.driver_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | paid
  notes text,
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.driver_withdrawals TO authenticated;
GRANT ALL ON public.driver_withdrawals TO service_role;
ALTER TABLE public.driver_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Driver views own withdrawals" ON public.driver_withdrawals FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Driver requests withdrawal" ON public.driver_withdrawals FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid() AND public.has_role(auth.uid(), 'driver'));
CREATE POLICY "Admin updates withdrawals" ON public.driver_withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER driver_withdrawals_set_updated_at BEFORE UPDATE ON public.driver_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- allow admins to update documents (approve/reject)
DROP POLICY IF EXISTS "Admins update documents" ON public.documents;
CREATE POLICY "Admins update documents" ON public.documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
