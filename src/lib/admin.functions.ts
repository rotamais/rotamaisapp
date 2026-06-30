import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: any; userId: string; claims?: any }) {
  const seededAdminEmail = ["rotamais@rotamais.app", "rotamais@rotamais.com"];
  const seededAdminName = ["rotamais", "rota mais"];
  const normalizedEmail = String(context.claims?.email ?? "").trim().toLowerCase();
  const normalizedName = String(context.claims?.user_metadata?.full_name ?? "")
    .trim()
    .toLowerCase();

  if (
    seededAdminEmail.includes(normalizedEmail) ||
    seededAdminName.includes(normalizedName)
  ) {
    return;
  }

  const { data: roleRows, error: roleError } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .limit(1);

  if (!roleError && roleRows?.length) return;

  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

async function getAdminSupabase(context: { supabase: any }) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }

  return context.supabase;
}

// ============ DASHBOARD ============

export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const monthAgo = new Date(Date.now() - 30 * 86400000);

    const [
      profilesCnt,
      driversOnline,
      ridesInProgress,
      ridesCompletedToday,
      revToday,
      revWeek,
      revMonth,
      onlineDrivers,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("drivers")
        .select("id", { count: "exact", head: true })
        .eq("is_online", true),
      supabaseAdmin
        .from("rides")
        .select("id", { count: "exact", head: true })
        .in("status", ["accepted", "driver_arrived", "in_progress"]),
      supabaseAdmin
        .from("rides")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", today.toISOString()),
      supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("status", "paid")
        .gte("created_at", today.toISOString()),
      supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("status", "paid")
        .gte("created_at", weekAgo.toISOString()),
      supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("status", "paid")
        .gte("created_at", monthAgo.toISOString()),
      supabaseAdmin
        .from("drivers")
        .select("id, current_lat, current_lng, rating")
        .eq("is_online", true)
        .not("current_lat", "is", null)
        .limit(100),
    ]);

    const sum = (rows: any[] | null) =>
      (rows ?? []).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

    return {
      total_users: profilesCnt.count ?? 0,
      drivers_online: driversOnline.count ?? 0,
      rides_in_progress: ridesInProgress.count ?? 0,
      rides_completed_today: ridesCompletedToday.count ?? 0,
      revenue_today: sum(revToday.data),
      revenue_week: sum(revWeek.data),
      revenue_month: sum(revMonth.data),
      online_drivers: onlineDrivers.data ?? [],
    };
  });

// ============ USERS ============

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ search: z.string().optional(), limit: z.number().int().max(200).default(100) })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    let q = supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, rating, total_rides, is_blocked, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.search) q = q.ilike("full_name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminSetUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), blocked: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_blocked: data.blocked })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUserHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const { data: rides, error } = await supabaseAdmin
      .from("rides")
      .select(
        "id, status, origin_address, destination_address, final_fare, estimated_fare, completed_at, created_at",
      )
      .or(`passenger_id.eq.${data.user_id},driver_id.eq.${data.user_id}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rides ?? [];
  });

// ============ DRIVERS ============

export const adminListDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.enum(["all", "pending", "verified", "suspended"]).default("all") })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    let q = supabaseAdmin
      .from("drivers")
      .select(
        "id, license_number, license_category, is_verified, is_online, is_suspended, suspended_reason, rating, total_trips, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status === "pending") q = q.eq("is_verified", false).eq("is_suspended", false);
    if (data.status === "verified") q = q.eq("is_verified", true).eq("is_suspended", false);
    if (data.status === "suspended") q = q.eq("is_suspended", true);
    const { data: drivers, error } = await q;
    if (error) throw new Error(error.message);
    if (!drivers?.length) return [];
    const ids = drivers.map((d) => d.id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return drivers.map((d) => ({ ...d, profile: map.get(d.id) ?? null }));
  });

export const adminApproveDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ driver_id: z.string().uuid(), approved: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const { error } = await supabaseAdmin
      .from("drivers")
      .update({ is_verified: data.approved })
      .eq("id", data.driver_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSuspendDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        driver_id: z.string().uuid(),
        suspended: z.boolean(),
        reason: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const { error } = await supabaseAdmin
      .from("drivers")
      .update({
        is_suspended: data.suspended,
        suspended_reason: data.reason ?? null,
        is_online: false,
      })
      .eq("id", data.driver_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDriverDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ driver_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const [docsRes, vehiclesRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from("documents")
        .select("*")
        .eq("user_id", data.driver_id)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("vehicles").select("*").eq("driver_id", data.driver_id),
      supabaseAdmin
        .from("profiles")
        .select("full_name, phone")
        .eq("id", data.driver_id)
        .maybeSingle(),
    ]);
    if (docsRes.error) throw new Error(docsRes.error.message);
    const paths = (docsRes.data ?? []).map((d: any) => d.storage_path).filter(Boolean);
    const urls: Record<string, string> = {};
    if (paths.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from("documents")
        .createSignedUrls(paths, 60 * 30);
      (signed ?? []).forEach((s: any) => {
        if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
      });
    }
    const docs = (docsRes.data ?? []).map((d: any) => ({
      ...d,
      url: urls[d.storage_path] ?? null,
    }));
    return { documents: docs, vehicles: vehiclesRes.data ?? [], profile: profileRes.data ?? null };
  });

async function setDocumentVerified(
  context: { supabase: any; userId: string },
  document_id: string,
  verified: boolean,
) {
  await ensureAdmin(context);
  const supabaseAdmin = await getAdminSupabase(context);
  const { data: doc, error } = await supabaseAdmin
    .from("documents")
    .update({ verified, verified_at: verified ? new Date().toISOString() : null })
    .eq("id", document_id)
    .select("id, user_id, type, verified")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!doc) throw new Error("Documento não encontrado");
  return { ok: true, document: doc };
}

export const adminVerifyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ document_id: z.string().uuid(), verified: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) =>
    setDocumentVerified(context, data.document_id, data.verified),
  );

export const adminApproveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => setDocumentVerified(context, data.document_id, true));

export const adminRevokeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => setDocumentVerified(context, data.document_id, false));

// ============ RIDES ============

export const adminListRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["all", "live", "completed", "cancelled"]).default("all"),
        limit: z.number().int().max(500).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    let q = supabaseAdmin
      .from("rides")
      .select(
        "id, status, origin_address, destination_address, estimated_fare, final_fare, payment_method, payment_status, requested_at, completed_at, passenger_id, driver_id, distance_km",
      )
      .order("requested_at", { ascending: false })
      .limit(data.limit);
    if (data.status === "live")
      q = q.in("status", ["requested", "accepted", "driver_arrived", "in_progress"]);
    if (data.status === "completed") q = q.eq("status", "completed");
    if (data.status === "cancelled") q = q.eq("status", "cancelled");
    const { data: rides, error } = await q;
    if (error) throw new Error(error.message);
    return rides ?? [];
  });

// ============ FINANCE ============

export const adminFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [settings, txns, pendingWds] = await Promise.all([
      supabaseAdmin.from("platform_settings").select("*").limit(1).maybeSingle(),
      supabaseAdmin
        .from("transactions")
        .select("id, amount, status, method, created_at, ride_id, payer_id, payee_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin.from("driver_withdrawals").select("*").eq("status", "pending"),
    ]);

    const fee = Number(settings.data?.platform_fee_percent ?? 20);
    const paid = (txns.data ?? []).filter((t) => t.status === "paid");
    const gross = paid.reduce((a, t) => a + Number(t.amount), 0);
    const platform_revenue = (gross * fee) / 100;

    return {
      platform_fee_percent: fee,
      transactions: txns.data ?? [],
      pending_withdrawals: pendingWds.data ?? [],
      gross_30d: gross,
      platform_revenue_30d: platform_revenue,
    };
  });

export const adminUpdatePlatformFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fee_percent: z.number().min(0).max(100) }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const { data: existing } = await supabaseAdmin
      .from("platform_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin
        .from("platform_settings")
        .update({ platform_fee_percent: data.fee_percent })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("platform_settings")
        .insert({ platform_fee_percent: data.fee_percent });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminProcessWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        withdrawal_id: z.string().uuid(),
        status: z.enum(["approved", "rejected", "paid"]),
        notes: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const { error } = await supabaseAdmin
      .from("driver_withdrawals")
      .update({
        status: data.status,
        notes: data.notes ?? null,
        processed_at: new Date().toISOString(),
        processed_by: context.userId,
      })
      .eq("id", data.withdrawal_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ REPORTS & CHARTS ============

export const adminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const supabaseAdmin = await getAdminSupabase(context);
    const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

    // Rides grouped by day (last 30 days)
    const { data: rides30 } = await supabaseAdmin
      .from("rides")
      .select("id, created_at, status, final_fare")
      .gte("created_at", daysAgo(30))
      .order("created_at", { ascending: true });

    // Transactions last 30 days
    const { data: txns30 } = await supabaseAdmin
      .from("transactions")
      .select("id, amount, status, method, created_at")
      .gte("created_at", daysAgo(30))
      .order("created_at", { ascending: true });

    // Build daily buckets for rides
    const rideMap = new Map<string, { total: number; completed: number; cancelled: number }>();
    const revenueMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      rideMap.set(d, { total: 0, completed: 0, cancelled: 0 });
      revenueMap.set(d, 0);
    }
    for (const r of (rides30 ?? [])) {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      const entry = rideMap.get(day);
      if (entry) {
        entry.total++;
        if (r.status === "completed") entry.completed++;
        if (r.status === "cancelled") entry.cancelled++;
      }
    }
    for (const t of (txns30 ?? [])) {
      if (t.status === "paid") {
        const day = new Date(t.created_at).toISOString().slice(0, 10);
        revenueMap.set(day, (revenueMap.get(day) ?? 0) + Number(t.amount));
      }
    }

    const ridesByDay = Array.from(rideMap.entries()).map(([date, v]) => ({ date, ...v }));
    const revenueByDay = Array.from(revenueMap.entries()).map(([date, amount]) => ({ date, amount }));

    // Payment methods distribution
    const methodCount: Record<string, number> = {};
    for (const r of (rides30 ?? [])) {
      if (r.status === "completed" && (r as any).payment_method) {
        const m = (r as any).payment_method;
        methodCount[m] = (methodCount[m] ?? 0) + 1;
      }
    }
    const paymentMethods = Object.entries(methodCount).map(([name, value]) => ({ name, value, label: name }));

    // Payment status distribution
    const statusCount: Record<string, number> = {};
    for (const t of (txns30 ?? [])) {
      statusCount[t.status] = (statusCount[t.status] ?? 0) + 1;
    }
    const paymentStatus = Object.entries(statusCount).map(([name, value]) => ({ name, value, label: name }));

    // Total completed rides
    const totalCompleted = (rides30 ?? []).filter((r) => r.status === "completed").length;
    const totalCancelled = (rides30 ?? []).filter((r) => r.status === "cancelled").length;

    return {
      rides_by_day: ridesByDay,
      revenue_by_day: revenueByDay,
      payment_methods: paymentMethods,
      payment_status: paymentStatus,
      total_completed_30d: totalCompleted,
      total_cancelled_30d: totalCancelled,
    };
  });
