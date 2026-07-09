import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NearbyDriver = {
  id: string;
  lat: number;
  lng: number;
  distance_km: number;
  rating: number | null;
  total_trips: number;
  full_name: string | null;
  avatar_url: string | null;
};

export const listNearbyDrivers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lat: number; lng: number; radiusKm?: number; limit?: number }) => {
    if (typeof input?.lat !== "number" || typeof input?.lng !== "number") {
      throw new Error("lat/lng são obrigatórios");
    }
    return {
      lat: input.lat,
      lng: input.lng,
      radiusKm: input.radiusKm ?? 5,
      limit: input.limit ?? 12,
    };
  })
  .handler(async ({ data, context }): Promise<NearbyDriver[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("nearby_drivers", {
      _lat: data.lat,
      _lng: data.lng,
      _radius_km: data.radiusKm,
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<{
      id: string;
      lat: number;
      lng: number;
      distance_km: number;
      rating: number | null;
      total_trips: number;
    }>;
    if (list.length === 0) return [];

    const ids = list.map((r) => r.id);
    const { data: profiles } = await supabase
      .from("profiles_public")
      .select("id, full_name, avatar_url")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return list.map((r) => {
      const p = map.get(r.id) as { full_name?: string; avatar_url?: string } | undefined;
      return {
        ...r,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });
  });
