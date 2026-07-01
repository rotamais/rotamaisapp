import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSavedPlaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_places")
      .select("*")
      .eq("user_id", context.userId)
      .order("label", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const savePlaceSchema = z.object({
  label: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  icon: z.string().default("home"),
});

export const savePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => savePlaceSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("saved_places")
      .upsert(
        { ...data, user_id: context.userId },
        { onConflict: "user_id,label" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSavedPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("saved_places")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
