
DROP POLICY IF EXISTS "Driver creates carpool" ON public.carpools;
CREATE POLICY "Driver creates carpool" ON public.carpools FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid() AND public.has_role(auth.uid(), 'driver'));

DROP POLICY IF EXISTS "Passenger creates ride" ON public.rides;
CREATE POLICY "Passenger creates ride" ON public.rides FOR INSERT TO authenticated
  WITH CHECK (passenger_id = auth.uid() AND public.has_role(auth.uid(), 'passenger'));
