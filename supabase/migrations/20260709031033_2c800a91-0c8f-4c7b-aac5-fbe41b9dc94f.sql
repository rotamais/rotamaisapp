CREATE OR REPLACE FUNCTION public.nearby_drivers(_lat double precision, _lng double precision, _radius_km double precision DEFAULT 5, _limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  lat double precision,
  lng double precision,
  distance_km double precision,
  rating numeric,
  total_trips integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    d.id,
    d.current_lat::double precision AS lat,
    d.current_lng::double precision AS lng,
    -- Haversine distance in km
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(_lat)) * cos(radians(d.current_lat)) *
          cos(radians(d.current_lng) - radians(_lng)) +
          sin(radians(_lat)) * sin(radians(d.current_lat))
        ))
      )
    ) AS distance_km,
    d.rating,
    d.total_trips
  FROM public.drivers d
  WHERE d.is_online = true
    AND d.is_verified = true
    AND d.is_suspended = false
    AND d.current_lat IS NOT NULL
    AND d.current_lng IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(_lat)) * cos(radians(d.current_lat)) *
          cos(radians(d.current_lng) - radians(_lng)) +
          sin(radians(_lat)) * sin(radians(d.current_lat))
        ))
      )
    ) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT _limit
$$;

REVOKE ALL ON FUNCTION public.nearby_drivers(double precision, double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearby_drivers(double precision, double precision, double precision, integer) TO authenticated;