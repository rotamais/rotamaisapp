
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('passenger', 'driver', 'admin', 'fleet_operator');
CREATE TYPE public.ride_status AS ENUM ('requested','accepted','driver_arrived','in_progress','completed','cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash','card','pix','wallet');
CREATE TYPE public.payment_status AS ENUM ('pending','authorized','paid','failed','refunded');
CREATE TYPE public.vehicle_type AS ENUM ('car','motorcycle','van','bike','scooter');
CREATE TYPE public.document_type AS ENUM ('cnh','crlv','vehicle_photo','profile_photo','insurance','other');
CREATE TYPE public.carpool_status AS ENUM ('open','full','in_progress','completed','cancelled');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','rejected','cancelled');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  default_payment_method public.payment_method DEFAULT 'card',
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_rides INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Auto-create profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'passenger');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FLEETS ============
CREATE TABLE public.fleets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleets TO authenticated;
GRANT ALL ON public.fleets TO service_role;
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their fleet" ON public.fleets FOR SELECT TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Fleet operators create" ON public.fleets FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(),'fleet_operator'));
CREATE POLICY "Owners update their fleet" ON public.fleets FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete their fleet" ON public.fleets FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER fleets_set_updated_at BEFORE UPDATE ON public.fleets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DRIVERS ============
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fleet_id UUID REFERENCES public.fleets(id) ON DELETE SET NULL,
  license_number TEXT NOT NULL,
  license_expires_at DATE,
  license_category TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_lat NUMERIC(9,6),
  current_lng NUMERIC(9,6),
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_trips INT NOT NULL DEFAULT 0,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers publicly visible" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Driver inserts own record" ON public.drivers FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND public.has_role(auth.uid(),'driver'));
CREATE POLICY "Driver updates own record" ON public.drivers FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin/owner deletes driver" ON public.drivers FOR DELETE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER drivers_set_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX drivers_online_idx ON public.drivers(is_online) WHERE is_online = true;

-- ============ VEHICLES ============
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  fleet_id UUID REFERENCES public.fleets(id) ON DELETE SET NULL,
  type public.vehicle_type NOT NULL DEFAULT 'car',
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT,
  color TEXT,
  plate TEXT NOT NULL UNIQUE,
  seats INT NOT NULL DEFAULT 4,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicles visible to authenticated" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Driver/fleet inserts vehicle" ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_id AND f.owner_id = auth.uid()));
CREATE POLICY "Driver/fleet updates vehicle" ON public.vehicles FOR UPDATE TO authenticated
  USING (driver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_id AND f.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Driver/fleet deletes vehicle" ON public.vehicles FOR DELETE TO authenticated
  USING (driver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_id AND f.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type public.document_type NOT NULL,
  storage_path TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin views documents" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner inserts documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin updates documents" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);
CREATE POLICY "Owner deletes documents" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ RIDES ============
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status public.ride_status NOT NULL DEFAULT 'requested',
  origin_address TEXT NOT NULL,
  origin_lat NUMERIC(9,6) NOT NULL,
  origin_lng NUMERIC(9,6) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat NUMERIC(9,6) NOT NULL,
  destination_lng NUMERIC(9,6) NOT NULL,
  distance_km NUMERIC(8,2),
  duration_min INT,
  estimated_fare NUMERIC(10,2),
  final_fare NUMERIC(10,2),
  payment_method public.payment_method NOT NULL DEFAULT 'card',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rides TO authenticated;
GRANT ALL ON public.rides TO service_role;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ride participants view" ON public.rides FOR SELECT TO authenticated
  USING (passenger_id = auth.uid() OR driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR (driver_id IS NULL AND status = 'requested' AND public.has_role(auth.uid(),'driver')));
CREATE POLICY "Passenger creates ride" ON public.rides FOR INSERT TO authenticated
  WITH CHECK (passenger_id = auth.uid());
CREATE POLICY "Participants update ride" ON public.rides FOR UPDATE TO authenticated
  USING (passenger_id = auth.uid() OR driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR (status = 'requested' AND public.has_role(auth.uid(),'driver')));
CREATE TRIGGER rides_set_updated_at BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX rides_status_idx ON public.rides(status);
CREATE INDEX rides_passenger_idx ON public.rides(passenger_id);
CREATE INDEX rides_driver_idx ON public.rides(driver_id);

-- ============ CARPOOLS ============
CREATE TABLE public.carpools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  origin_address TEXT NOT NULL,
  origin_lat NUMERIC(9,6) NOT NULL,
  origin_lng NUMERIC(9,6) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat NUMERIC(9,6) NOT NULL,
  destination_lng NUMERIC(9,6) NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  seats_total INT NOT NULL CHECK (seats_total > 0),
  seats_available INT NOT NULL,
  price_per_seat NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.carpool_status NOT NULL DEFAULT 'open',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carpools TO authenticated;
GRANT ALL ON public.carpools TO service_role;
ALTER TABLE public.carpools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Carpools visible to authenticated" ON public.carpools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Driver creates carpool" ON public.carpools FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
CREATE POLICY "Driver updates carpool" ON public.carpools FOR UPDATE TO authenticated USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Driver deletes carpool" ON public.carpools FOR DELETE TO authenticated USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER carpools_set_updated_at BEFORE UPDATE ON public.carpools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CARPOOL BOOKINGS ============
CREATE TABLE public.carpool_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carpool_id UUID NOT NULL REFERENCES public.carpools(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seats INT NOT NULL DEFAULT 1 CHECK (seats > 0),
  status public.booking_status NOT NULL DEFAULT 'pending',
  pickup_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(carpool_id, passenger_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carpool_bookings TO authenticated;
GRANT ALL ON public.carpool_bookings TO service_role;
ALTER TABLE public.carpool_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Booking participants view" ON public.carpool_bookings FOR SELECT TO authenticated
  USING (passenger_id = auth.uid() OR EXISTS (SELECT 1 FROM public.carpools c WHERE c.id = carpool_id AND c.driver_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Passenger creates booking" ON public.carpool_bookings FOR INSERT TO authenticated WITH CHECK (passenger_id = auth.uid());
CREATE POLICY "Participants update booking" ON public.carpool_bookings FOR UPDATE TO authenticated
  USING (passenger_id = auth.uid() OR EXISTS (SELECT 1 FROM public.carpools c WHERE c.id = carpool_id AND c.driver_id = auth.uid()));
CREATE POLICY "Passenger deletes booking" ON public.carpool_bookings FOR DELETE TO authenticated USING (passenger_id = auth.uid());
CREATE TRIGGER carpool_bookings_set_updated_at BEFORE UPDATE ON public.carpool_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
  carpool_id UUID REFERENCES public.carpools(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ride_id IS NOT NULL OR carpool_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public to authenticated" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reviewer creates review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Reviewer updates own review" ON public.reviews FOR UPDATE TO authenticated USING (reviewer_id = auth.uid());
CREATE POLICY "Reviewer deletes own review" ON public.reviews FOR DELETE TO authenticated USING (reviewer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
  carpool_id UUID REFERENCES public.carpools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ride_id IS NOT NULL OR carpool_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversation participants view" ON public.messages FOR SELECT TO authenticated USING (
  sender_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.carpools c WHERE c.id = carpool_id AND c.driver_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.carpool_bookings b WHERE b.carpool_id = messages.carpool_id AND b.passenger_id = auth.uid())
);
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.carpools c WHERE c.id = carpool_id AND c.driver_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.carpool_bookings b WHERE b.carpool_id = messages.carpool_id AND b.passenger_id = auth.uid())
  )
);
CREATE INDEX messages_ride_idx ON public.messages(ride_id);
CREATE INDEX messages_carpool_idx ON public.messages(carpool_id);

-- ============ PAYMENT METHODS ============
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  brand TEXT,
  last4 TEXT,
  stripe_payment_method_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages payment methods" ON public.payment_methods FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ TRANSACTIONS ============
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  carpool_booking_id UUID REFERENCES public.carpool_bookings(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES auth.users(id),
  payee_id UUID REFERENCES auth.users(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status public.payment_status NOT NULL DEFAULT 'pending',
  method public.payment_method NOT NULL,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view transactions" ON public.transactions FOR SELECT TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER transactions_set_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.carpool_bookings;
