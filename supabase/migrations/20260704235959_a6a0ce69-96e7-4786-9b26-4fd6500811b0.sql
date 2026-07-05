
-- 1. Tighten ride update rules: block cancellation fields and distance/duration on driver acceptance and driver updates
CREATE OR REPLACE FUNCTION public.enforce_ride_update_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := public.has_role(uid, 'admin'::app_role);
BEGIN
  IF uid IS NULL OR is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.passenger_id IS DISTINCT FROM OLD.passenger_id THEN
    RAISE EXCEPTION 'passenger_id cannot be modified';
  END IF;

  -- Passenger updates
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
       OR NEW.destination_lng IS DISTINCT FROM OLD.destination_lng
       OR NEW.distance_km IS DISTINCT FROM OLD.distance_km
       OR NEW.duration_min IS DISTINCT FROM OLD.duration_min
       OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
       OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason THEN
      RAISE EXCEPTION 'driver cannot modify fare, payment, trip, distance, or cancellation fields when accepting a ride';
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
       OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
       OR NEW.origin_lat IS DISTINCT FROM OLD.origin_lat
       OR NEW.origin_lng IS DISTINCT FROM OLD.origin_lng
       OR NEW.destination_lat IS DISTINCT FROM OLD.destination_lat
       OR NEW.destination_lng IS DISTINCT FROM OLD.destination_lng THEN
      RAISE EXCEPTION 'driver cannot modify fare, payment, or address fields';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'not authorized to update this ride';
END;
$function$;

-- 2. Explicit INSERT policy on transactions: deny all client-side inserts.
-- Service role (edge functions / server admin client) bypasses RLS and remains the only writer.
DROP POLICY IF EXISTS "No client inserts on transactions" ON public.transactions;
CREATE POLICY "No client inserts on transactions"
ON public.transactions
FOR INSERT
TO authenticated, anon
WITH CHECK (false);
