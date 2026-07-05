import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders(extra: Record<string, string> = {}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !connectionKey) {
    throw new Error("Google Maps connector não configurado");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    ...extra,
  };
}

export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lat: z.number(), lng: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR`;
    const res = await fetch(url, { headers: gatewayHeaders() });
    const json = await res.json();
    if (!res.ok || json.status !== "OK") {
      throw new Error(`Geocoding ${res.status}: ${json.status ?? "erro"}`);
    }
    const first = json.results?.[0];
    return {
      address: first?.formatted_address ?? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
    };
  });

export const geocodeAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ address: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(
      data.address,
    )}&language=pt-BR&region=br`;
    const res = await fetch(url, { headers: gatewayHeaders() });
    const json = await res.json();
    if (!res.ok || json.status !== "OK") {
      throw new Error(`Geocoding ${res.status}: ${json.status ?? "erro"}`);
    }
    const first = json.results?.[0];
    if (!first?.geometry?.location) throw new Error("Endereço não encontrado");
    return {
      address: first.formatted_address as string,
      lat: first.geometry.location.lat as number,
      lng: first.geometry.location.lng as number,
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
    const url = `${GATEWAY_URL}/routes/directions/v2:computeRoutes`;
    const res = await fetch(url, {
      method: "POST",
      headers: gatewayHeaders({
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      }),
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: data.origin.lat, longitude: data.origin.lng } } },
        destination: {
          location: { latLng: { latitude: data.destination.lat, longitude: data.destination.lng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        languageCode: "pt-BR",
        regionCode: "BR",
        units: "METRIC",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Routes ${res.status}: ${json.error?.message ?? "erro"}`);
    const route = json.routes?.[0];
    if (!route) throw new Error("Sem rotas");
    const durationSec = Number(String(route.duration ?? "0s").replace(/s$/, "")) || 0;
    return {
      distance_km: (route.distanceMeters ?? 0) / 1000,
      duration_min: Math.max(1, Math.round(durationSec / 60)),
      polyline: route.polyline?.encodedPolyline as string | undefined,
    };
  });
