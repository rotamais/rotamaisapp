import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function headers() {
  const lov = process.env.LOVABLE_API_KEY;
  const gm = process.env.GOOGLE_MAPS_API_KEY;
  if (!lov || !gm) throw new Error("Google Maps connector ausente");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": gm,
    "Content-Type": "application/json",
  };
}

export const reverseGeocode = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ lat: z.number(), lng: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const url = `${GATEWAY}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR`;
    const res = await fetch(url, { headers: headers() });
    const json = await res.json();
    if (!res.ok) throw new Error(`Geocoding ${res.status}`);
    const first = json.results?.[0];
    return {
      address: first?.formatted_address ?? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
    };
  });

export const computeRoute = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        origin: z.object({ lat: z.number(), lng: z.number() }),
        destination: z.object({ lat: z.number(), lng: z.number() }),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        ...headers(),
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: data.origin.lat, longitude: data.origin.lng } } },
        destination: {
          location: { latLng: { latitude: data.destination.lat, longitude: data.destination.lng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        languageCode: "pt-BR",
        regionCode: "BR",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Routes ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
    const r = json.routes?.[0];
    if (!r) throw new Error("Sem rotas");
    const seconds = Number(String(r.duration ?? "0s").replace("s", ""));
    return {
      distance_km: r.distanceMeters / 1000,
      duration_min: Math.max(1, Math.round(seconds / 60)),
      polyline: r.polyline?.encodedPolyline as string | undefined,
    };
  });
