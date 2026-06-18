DROP POLICY IF EXISTS "Vehicles visible to authenticated" ON public.vehicles;

CREATE POLICY "Vehicles visible to owner, fleet, active passengers and admin"
ON public.vehicles
FOR SELECT
TO authenticated
USING (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.fleets f
    WHERE f.id = vehicles.fleet_id AND f.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.driver_id = vehicles.driver_id
      AND r.passenger_id = auth.uid()
      AND r.status IN ('accepted','driver_arrived','in_progress')
  )
  OR EXISTS (
    SELECT 1 FROM public.carpool_bookings b
    JOIN public.carpools c ON c.id = b.carpool_id
    WHERE c.vehicle_id = vehicles.id
      AND b.passenger_id = auth.uid()
      AND b.status IN ('pending','confirmed')
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);