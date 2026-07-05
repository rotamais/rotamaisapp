import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Free providers — no API key required.
// Geocoding: Nominatim (OpenStreetMap)
// Routing:   OSRM public demo server
// Please respect fair-use policies of these public services.

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";
const UA = "RotaMaisApp/1.0 (contact@rotamais.app)";

export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lat: z.number(), lng: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${data.lat}&lon=${data.lng}&accept-language=pt-BR`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error(`Reverse geocoding ${res.status}`);
    const json = (await res.json()) as { display_name?: string };
    return {
      address: json.display_name ?? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
    };
  });

export const geocodeAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ address: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const url = `${NOMINATIM}/search?format=jsonv2&q=${encodeURIComponent(
      data.address,
    )}&limit=1&accept-language=pt-BR&countrycodes=br`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error(`Geocoding ${res.status}`);
    const arr = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    const first = arr[0];
    if (!first) throw new Error("Endereço não encontrado");
    return {
      address: first.display_name,
      lat: Number(first.lat),
      lng: Number(first.lon),
    };
  });

export const searchAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        query: z.string().min(3).max(200),
        near: z.object({ lat: z.number(), lng: z.number() }).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      format: "jsonv2",
      q: data.query,
      limit: "5",
      "accept-language": "pt-BR",
      countrycodes: "br",
      addressdetails: "1",
    });
    if (data.near) {
      // ~50km bias box
      const d = 0.5;
      const { lat, lng } = data.near;
      params.set("viewbox", `${lng - d},${lat + d},${lng + d},${lat - d}`);
      params.set("bounded", "0");
    }
    const res = await fetch(`${NOMINATIM}/search?${params.toString()}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Search ${res.status}`);
    const arr = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      name?: string;
    }>;
    return arr.map((r) => {
      const parts = r.display_name.split(",");
      return {
        placeId: String(r.place_id),
        primary: r.name || parts[0]?.trim() || r.display_name,
        secondary: parts.slice(1, 4).join(", ").trim(),
        address: r.display_name,
        lat: Number(r.lat),
        lng: Number(r.lon),
      };
    });
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
    const { origin, destination } = data;
    const url =
      `${OSRM}/route/v1/driving/` +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      `?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const json = (await res.json()) as {
      code: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      }>;
      message?: string;
    };
    if (!res.ok || json.code !== "Ok" || !json.routes?.[0]) {
      throw new Error(`Routes ${res.status}: ${json.message ?? json.code ?? "erro"}`);
    }
    const route = json.routes[0];
    // GeoJSON is [lng, lat]; convert to [lat, lng]
    const coords: [number, number][] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    return {
      distance_km: route.distance / 1000,
      duration_min: Math.max(1, Math.round(route.duration / 60)),
      coords,
    };
  });
