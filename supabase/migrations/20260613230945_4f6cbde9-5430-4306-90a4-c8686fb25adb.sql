
-- ============ RIDES ============
DROP POLICY IF EXISTS "Participants update ride" ON public.rides;

CREATE POLICY "Participants update ride"
ON public.rides FOR UPDATE
TO authenticated
USING (
  passenger_id = auth.uid()
  OR driver_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (status = 'requested'::ride_status AND driver_id IS NULL AND public.has_role(auth.uid(), 'driver'::app_role))
)
WITH CHECK (
  passenger_id = auth.uid()
  OR driver_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger to enforce field-level immutability on rides
CREATE OR REPLACE FUNCTION public.enforce_ride_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := public.has_role(uid, 'admin'::app_role);
BEGIN
  -- Admins and service role (uid NULL) bypass
  IF uid IS NULL OR is_admin THEN
    RETURN NEW;
  END IF;

  -- passenger_id is immutable for everyone except admin/service
  IF NEW.passenger_id IS DISTINCT FROM OLD.passenger_id THEN
    RAISE EXCEPTION 'passenger_id cannot be modified';
  END IF;

  -- Passenger can edit their own ride but cannot change financial/driver fields
  IF uid = OLD.passenger_id THEN
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id
       OR NEW.estimated_fare IS DISTINCT FROM OLD.estimated_fare
       OR NEW.final_fare IS DISTINCT FROM OLD.final_fare
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.distance_km IS DISTINCT FROM OLD.distance_km
       OR NEW.duration_min IS DISTINCT FROM OLD.duration_min THEN
      RAISE EXCEPTION 'passenger cannot modify driver assignment or fare/payment fields';
    END IF;
    RETURN NEW;
  END IF;

  -- Driver claiming a requested ride
  IF OLD.driver_id IS NULL AND OLD.status = 'requested'::ride_status THEN
    IF NEW.driver_id IS DISTINCT FROM uid THEN
      RAISE EXCEPTION 'driver can only claim a ride by setting driver_id to themselves';
    END IF;
    IF NEW.estimated_fare IS DISTINCT FROM OLD.estimated_fare
       OR NEW.final_fare IS DISTINCT FROM OLD.final_fare
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.origin_address IS DISTINCT FROM OLD.origin_address
       OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
       OR NEW.origin_lat IS DISTINCT FROM OLD.origin_lat
       OR NEW.origin_lng IS DISTINCT FROM OLD.origin_lng
       OR NEW.destination_lat IS DISTINCT FROM OLD.destination_lat
       OR NEW.destination_lng IS DISTINCT FROM OLD.destination_lng THEN
      RAISE EXCEPTION 'driver cannot modify fare, payment, or trip address fields when accepting a ride';
    END IF;
    RETURN NEW;
  END IF;

  -- Assigned driver updating their ride
  IF uid = OLD.driver_id THEN
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
      RAISE EXCEPTION 'driver cannot reassign driver_id';
    END IF;
    IF NEW.estimated_fare IS DISTINCT FROM OLD.estimated_fare
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.origin_address IS DISTINCT FROM OLD.origin_address
       OR NEW.destination_address IS DISTINCT FROM OLD.destination_address THEN
      RAISE EXCEPTION 'driver cannot modify fare, payment, or address fields';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'not authorized to update this ride';
END;
$$;

DROP TRIGGER IF EXISTS rides_enforce_update_rules ON public.rides;
CREATE TRIGGER rides_enforce_update_rules
BEFORE UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.enforce_ride_update_rules();

-- ============ CARPOOL BOOKINGS ============
DROP POLICY IF EXISTS "Participants update booking" ON public.carpool_bookings;

CREATE POLICY "Participants update booking"
ON public.carpool_bookings FOR UPDATE
TO authenticated
USING (
  passenger_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.carpools c
    WHERE c.id = carpool_bookings.carpool_id AND c.driver_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  passenger_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.carpools c
    WHERE c.id = carpool_bookings.carpool_id AND c.driver_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE OR REPLACE FUNCTION public.enforce_carpool_booking_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := public.has_role(uid, 'admin'::app_role);
  is_carpool_driver boolean;
BEGIN
  IF uid IS NULL OR is_admin THEN
    RETURN NEW;
  END IF;

  -- passenger_id and carpool_id are immutable
  IF NEW.passenger_id IS DISTINCT FROM OLD.passenger_id
     OR NEW.carpool_id IS DISTINCT FROM OLD.carpool_id THEN
    RAISE EXCEPTION 'passenger_id and carpool_id cannot be changed';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.carpools c
    WHERE c.id = OLD.carpool_id AND c.driver_id = uid
  ) INTO is_carpool_driver;

  -- Passenger can only cancel their booking; cannot self-confirm or change seats
  IF uid = OLD.passenger_id AND NOT is_carpool_driver THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'passenger can only set booking status to cancelled';
    END IF;
    IF NEW.seats IS DISTINCT FROM OLD.seats THEN
      RAISE EXCEPTION 'passenger cannot modify seat count after booking';
    END IF;
    RETURN NEW;
  END IF;

  -- Carpool driver can update status (confirm/reject) but cannot change seats
  IF is_carpool_driver THEN
    IF NEW.seats IS DISTINCT FROM OLD.seats THEN
      RAISE EXCEPTION 'driver cannot modify seat count';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'not authorized to update this booking';
END;
$$;

DROP TRIGGER IF EXISTS carpool_bookings_enforce_update_rules ON public.carpool_bookings;
CREATE TRIGGER carpool_bookings_enforce_update_rules
BEFORE UPDATE ON public.carpool_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_carpool_booking_update_rules();
