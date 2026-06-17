import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const onboardingSchema = z.object({
  license_number: z.string().min(3),
  license_category: z.string().min(1),
  license_expires_at: z.string().optional(),
  bio: z.string().optional(),
  vehicle: z.object({
    type: z.enum(["car", "motorcycle", "van", "bike", "scooter"]),
    brand: z.string().min(1),
    model: z.string().min(1),
    year: z.number().int().min(1980).max(2100).optional(),
    color: z.string().optional(),
    plate: z.string().min(5),
    seats: z.number().int().min(1).max(8).default(4),
  }),
});

export const submitDriverOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => onboardingSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const plate = data.vehicle.plate.replace(/[\s-]/g, "").toUpperCase();

    // Garante o papel 'driver' (necessário pelas políticas RLS de drivers/vehicles).
    // Usuários que entraram via OAuth sem account_type=driver não recebem esse papel no trigger.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "driver" }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(`Não foi possível habilitar perfil de motorista: ${roleErr.message}`);


    // Upsert driver row (cobre caso de motoristas criados antes do trigger)
    const driverPayload = {
      id: context.userId,
      license_number: data.license_number,
      license_category: data.license_category,
      license_expires_at: data.license_expires_at ?? null,
      bio: data.bio ?? null,
    };
    const { data: upserted, error: dErr } = await sb
      .from("drivers")
      .upsert(driverPayload, { onConflict: "id" })
      .select("id");
    if (dErr) throw new Error(`Não foi possível salvar a CNH: ${dErr.message}`);
    if (!upserted || upserted.length === 0) {
      throw new Error("Cadastro de motorista não encontrado para este usuário.");
    }

    // Insere veículo (ou reusa o existente do mesmo motorista com a placa)
    const { data: existing, error: selErr } = await sb
      .from("vehicles")
      .select("id")
      .eq("driver_id", context.userId)
      .eq("plate", plate)
      .maybeSingle();
    if (selErr) throw new Error(`Erro ao consultar veículo: ${selErr.message}`);

    let vehicleId = existing?.id as string | undefined;
    if (!vehicleId) {
      const { data: v, error: vErr } = await sb
        .from("vehicles")
        .insert({
          driver_id: context.userId,
          type: data.vehicle.type,
          brand: data.vehicle.brand,
          model: data.vehicle.model,
          year: data.vehicle.year ?? null,
          color: data.vehicle.color ?? null,
          plate,
          seats: data.vehicle.seats,
        })
        .select("id")
        .single();
      if (vErr) {
        if ((vErr as any).code === "23505") {
          throw new Error("Esta placa já está cadastrada para outro motorista.");
        }
        throw new Error(`Erro ao salvar veículo: ${vErr.message}`);
      }
      vehicleId = v.id;
    }
    return { ok: true, vehicle_id: vehicleId };
  });

const DOC_TYPES = [
  "cnh",
  "crlv",
  "vehicle_photo",
  "profile_photo",
  "insurance",
  "identity",
  "vehicle_other",
  "other",
] as const;

export const registerDriverDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.enum(DOC_TYPES),
        storage_path: z.string().min(1),
        vehicle_id: z.string().uuid().optional(),
        replace: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // Quando substitui, apaga registros anteriores do mesmo tipo (e arquivos no storage).
    if (data.replace) {
      const { data: old } = await context.supabase
        .from("documents")
        .select("id, storage_path")
        .eq("user_id", context.userId)
        .eq("type", data.type);
      const paths = (old ?? []).map((d) => d.storage_path).filter(Boolean);
      if (paths.length) {
        await context.supabase.storage.from("documents").remove(paths);
        await context.supabase
          .from("documents")
          .delete()
          .in("id", (old ?? []).map((d) => d.id));
      }
    }
    const { error } = await context.supabase.from("documents").insert({
      user_id: context.userId,
      type: data.type,
      storage_path: data.storage_path,
      vehicle_id: data.vehicle_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDriverDocumentUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ paths: z.array(z.string().min(1)).max(50) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    if (!data.paths.length) return {} as Record<string, string>;
    const { data: signed, error } = await context.supabase.storage
      .from("documents")
      .createSignedUrls(data.paths, 60 * 30);
    if (error) throw new Error(error.message);
    const map: Record<string, string> = {};
    (signed ?? []).forEach((s: any) => {
      if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
    });
    return map;
  });

export const updateDriverVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        vehicle_id: z.string().uuid(),
        type: z.enum(["car", "motorcycle", "van", "bike", "scooter"]).optional(),
        brand: z.string().min(1).optional(),
        model: z.string().min(1).optional(),
        year: z.number().int().min(1980).max(2100).nullable().optional(),
        color: z.string().nullable().optional(),
        plate: z.string().min(5).optional(),
        seats: z.number().int().min(1).max(8).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { vehicle_id, plate, ...rest } = data;
    const payload: any = { ...rest };
    if (plate) payload.plate = plate.replace(/[\s-]/g, "").toUpperCase();
    const { error } = await context.supabase
      .from("vehicles")
      .update(payload)
      .eq("id", vehicle_id)
      .eq("driver_id", context.userId);
    if (error) throw new Error(`Erro ao atualizar veículo: ${error.message}`);
    return { ok: true };
  });


export const getDriverState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [{ data: driver }, { data: vehicles }, { data: docs }] = await Promise.all([
      sb.from("drivers").select("*").eq("id", context.userId).maybeSingle(),
      sb.from("vehicles").select("*").eq("driver_id", context.userId),
      sb.from("documents").select("*").eq("user_id", context.userId),
    ]);
    return { driver, vehicles: vehicles ?? [], documents: docs ?? [] };
  });

export const getDriverStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(Date.now() - 7 * 86400000);

    const [todayRides, weekRides, driver] = await Promise.all([
      sb
        .from("rides")
        .select("final_fare,completed_at")
        .eq("driver_id", context.userId)
        .eq("status", "completed")
        .gte("completed_at", today.toISOString()),
      sb
        .from("rides")
        .select("final_fare,completed_at")
        .eq("driver_id", context.userId)
        .eq("status", "completed")
        .gte("completed_at", weekStart.toISOString()),
      sb.from("drivers").select("rating,total_trips").eq("id", context.userId).maybeSingle(),
    ]);

    const sum = (rows: any[] | null) =>
      (rows ?? []).reduce((acc, r) => acc + Number(r.final_fare ?? 0), 0);

    // Ganhos por dia da semana (últimos 7 dias)
    const daily: number[] = Array(7).fill(0);
    (weekRides.data ?? []).forEach((r: any) => {
      if (!r.completed_at) return;
      const d = new Date(r.completed_at);
      const idx = 6 - Math.floor((today.getTime() - d.setHours(0, 0, 0, 0)) / 86400000);
      if (idx >= 0 && idx < 7) daily[idx] += Number(r.final_fare ?? 0);
    });

    return {
      earnings_today: sum(todayRides.data),
      rides_today: (todayRides.data ?? []).length,
      earnings_week: sum(weekRides.data),
      rides_week: (weekRides.data ?? []).length,
      rating: Number(driver.data?.rating ?? 5),
      total_trips: driver.data?.total_trips ?? 0,
      daily,
    };
  });

// Lista corridas disponíveis com perfil do passageiro (foto, nome e nota)
export const listAvailableRidesForDriver = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rides, error } = await context.supabase
      .from("rides")
      .select(
        "id, passenger_id, origin_address, destination_address, origin_lat, origin_lng, destination_lat, destination_lng, distance_km, duration_min, estimated_fare, vehicle_category, payment_method, requested_at",
      )
      .eq("status", "requested")
      .is("driver_id", null)
      .order("requested_at", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    if (!rides?.length) return [];
    const ids = Array.from(new Set(rides.map((r: any) => r.passenger_id)));
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, full_name, avatar_url, rating, total_rides")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return rides.map((r: any) => ({ ...r, passenger: map.get(r.passenger_id) ?? null }));
  });

// Ganhos detalhados do motorista por período (week | month | year)
export const getDriverEarnings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ period: z.enum(["week", "month", "year"]).default("week") }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const now = new Date();
    const start = new Date(now);
    if (data.period === "week") start.setDate(now.getDate() - 6);
    else if (data.period === "month") start.setDate(now.getDate() - 29);
    else start.setMonth(now.getMonth() - 11);
    start.setHours(0, 0, 0, 0);

    const { data: rides, error } = await sb
      .from("rides")
      .select("id, final_fare, distance_km, duration_min, completed_at, origin_address, destination_address")
      .eq("driver_id", context.userId)
      .eq("status", "completed")
      .gte("completed_at", start.toISOString())
      .order("completed_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = rides ?? [];
    const total = list.reduce((a, r: any) => a + Number(r.final_fare ?? 0), 0);
    const count = list.length;
    const avg = count ? total / count : 0;
    const distance = list.reduce((a, r: any) => a + Number(r.distance_km ?? 0), 0);

    // Buckets para o gráfico
    let bucketCount = 7;
    let labels: string[] = [];
    if (data.period === "week") {
      bucketCount = 7;
      labels = ["D", "S", "T", "Q", "Q", "S", "S"];
    } else if (data.period === "month") {
      bucketCount = 30;
      labels = Array.from({ length: 30 }, (_, i) => String(i + 1));
    } else {
      bucketCount = 12;
      labels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    }
    const buckets = Array(bucketCount).fill(0);
    list.forEach((r: any) => {
      if (!r.completed_at) return;
      const d = new Date(r.completed_at);
      let idx = 0;
      if (data.period === "week") {
        idx = 6 - Math.floor((now.getTime() - d.setHours(0, 0, 0, 0)) / 86400000);
      } else if (data.period === "month") {
        idx = 29 - Math.floor((now.getTime() - d.setHours(0, 0, 0, 0)) / 86400000);
      } else {
        idx = d.getMonth();
      }
      if (idx >= 0 && idx < bucketCount) buckets[idx] += Number(r.final_fare ?? 0);
    });

    return { total, count, avg, distance, buckets, labels, rides: list };
  });
