import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ RIDES ============

const requestRideSchema = z.object({
  origin_address: z.string().min(1),
  origin_lat: z.number(),
  origin_lng: z.number(),
  destination_address: z.string().min(1),
  destination_lat: z.number(),
  destination_lng: z.number(),
  distance_km: z.number().optional(),
  duration_min: z.number().int().optional(),
  estimated_fare: z.number().optional(),
  payment_method: z.enum(["cash", "card", "pix", "wallet"]).default("card"),
  vehicle_category: z.enum(["x", "comfort", "xl", "pet"]).optional(),
  notes: z.string().optional(),
});

export const requestRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => requestRideSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: ride, error } = await context.supabase
      .from("rides")
      .insert({ ...data, passenger_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return ride;
  });

export const listAvailableRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rides")
      .select("*")
      .eq("status", "requested")
      .is("driver_id", null)
      .order("requested_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  });

export const acceptRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ ride_id: z.string().uuid(), vehicle_id: z.string().uuid().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: ride, error } = await context.supabase
      .from("rides")
      .update({
        driver_id: context.userId,
        vehicle_id: data.vehicle_id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", data.ride_id)
      .eq("status", "requested")
      .is("driver_id", null)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return ride;
  });

export const updateRideStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        ride_id: z.string().uuid(),
        status: z.enum(["driver_arrived", "in_progress", "completed", "cancelled"]),
        final_fare: z.number().optional(),
        cancel_reason: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: ride, error } = await context.supabase
      .from("rides")
      .update({
        status: data.status,
        started_at: data.status === "in_progress" ? now : undefined,
        completed_at: data.status === "completed" ? now : undefined,
        final_fare: data.status === "completed" ? data.final_fare : undefined,
        cancelled_at: data.status === "cancelled" ? now : undefined,
        cancelled_by: data.status === "cancelled" ? context.userId : undefined,
        cancel_reason: data.status === "cancelled" ? data.cancel_reason : undefined,
      })
      .eq("id", data.ride_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return ride;
  });

export const getMyRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rides")
      .select("*")
      .or(`passenger_id.eq.${context.userId},driver_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data;
  });

// ============ DRIVER STATUS / LOCATION ============

export const updateDriverLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        lat: z.number(),
        lng: z.number(),
        is_online: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: driver, error } = await context.supabase
      .from("drivers")
      .update({
        current_lat: data.lat,
        current_lng: data.lng,
        is_online: data.is_online,
      })
      .eq("id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return driver;
  });

// ============ CARPOOLS ============

export const createCarpool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        vehicle_id: z.string().uuid().optional(),
        origin_address: z.string(),
        origin_lat: z.number(),
        origin_lng: z.number(),
        destination_address: z.string(),
        destination_lat: z.number(),
        destination_lng: z.number(),
        departure_at: z.string(),
        seats_total: z.number().int().min(1),
        price_per_seat: z.number().min(0),
        description: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: carpool, error } = await context.supabase
      .from("carpools")
      .insert({
        ...data,
        driver_id: context.userId,
        seats_available: data.seats_total,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return carpool;
  });

export const searchCarpools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("carpools")
      .select("*")
      .eq("status", "open")
      .gt("seats_available", 0)
      .gte("departure_at", new Date().toISOString())
      .order("departure_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  });

export const bookCarpool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        carpool_id: z.string().uuid(),
        seats: z.number().int().min(1).default(1),
        pickup_address: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: booking, error } = await context.supabase
      .from("carpool_bookings")
      .insert({ ...data, passenger_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return booking;
  });

// ============ REVIEWS ============

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        ride_id: z.string().uuid().optional(),
        carpool_id: z.string().uuid().optional(),
        reviewee_id: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().optional(),
      })
      .refine((v) => v.ride_id || v.carpool_id, { message: "ride_id ou carpool_id é obrigatório" })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: review, error } = await context.supabase
      .from("reviews")
      .insert({ ...data, reviewer_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return review;
  });

// ============ MESSAGES ============

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        ride_id: z.string().uuid().optional(),
        carpool_id: z.string().uuid().optional(),
        content: z.string().min(1),
      })
      .refine((v) => v.ride_id || v.carpool_id, { message: "ride_id ou carpool_id é obrigatório" })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: msg, error } = await context.supabase
      .from("messages")
      .insert({ ...data, sender_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return msg;
  });

// ============ ME ============

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (roles.error) throw new Error(roles.error.message);
    return {
      profile: profile.data,
      roles: (roles.data ?? []).map((r: any) => r.role),
    };
  });
