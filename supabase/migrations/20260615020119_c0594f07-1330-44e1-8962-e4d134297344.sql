DROP POLICY IF EXISTS "Passenger creates booking" ON public.carpool_bookings;
CREATE POLICY "Passenger creates booking"
  ON public.carpool_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid() AND public.has_role(auth.uid(), 'passenger'::app_role));