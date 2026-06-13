
-- 1. Atualizar handle_new_user para suportar account_type=driver
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct_type text := NEW.raw_user_meta_data->>'account_type';
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');

  -- Todo usuário pode ser passageiro
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'passenger')
  ON CONFLICT DO NOTHING;

  IF acct_type = 'driver' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'driver')
    ON CONFLICT DO NOTHING;

    -- Cria registro pendente em drivers (license_number será preenchido no onboarding)
    INSERT INTO public.drivers (id, license_number, is_verified, is_online, is_suspended)
    VALUES (NEW.id, '', false, false, false)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Garantir trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Permitir license_number vazio inicialmente (será preenchido no onboarding)
-- (já é NOT NULL com default omitido; aceitamos '' string)

-- 4. Realtime: adicionar rides e drivers
ALTER TABLE public.rides REPLICA IDENTITY FULL;
ALTER TABLE public.drivers REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
