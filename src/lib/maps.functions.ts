import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


function apiKey(): string {
  const key =
    typeof process !== "undefined"
      ? process.env.GOOGLE_MAPS_API_KEY
      : (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY não configurada");
  return key;
}

export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lat: z.number(), lng: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const key = apiKey();
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.lat},${data.lng}&key=${key}&language=pt-BR`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || json.status !== "OK")
      throw new Error(`Geocoding ${res.status}: ${json.status}`);
    const first = json.results?.[0];
    return {
      address: first?.formatted_address ?? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
    };
  });

export const computeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>

    z
      .object({
        origin: z.object({ lat: z.number(), lng: z.number() }),
        destination: z.object({ lat: z.number(), lng: z.number() }),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = apiKey();
    const origin = `${data.origin.lat},${data.origin.lng}`;
    const destination = `${data.destination.lat},${data.destination.lng}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${key}&language=pt-BR&region=BR`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || json.status !== "OK")
      throw new Error(`Directions ${res.status}: ${json.status}`);
    const route = json.routes?.[0];
    if (!route) throw new Error("Sem rotas");
    const leg = route.legs?.[0];
    return {
      distance_km: (leg?.distance?.value ?? 0) / 1000,
      duration_min: Math.max(1, Math.round((leg?.duration?.value ?? 0) / 60)),
      polyline: (route.overview_polyline?.points as string | undefined) ?? undefined,
    };
  });
