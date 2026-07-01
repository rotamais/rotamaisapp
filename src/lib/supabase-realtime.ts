import { supabase } from "@/integrations/supabase/client";

type RealtimeChannel = ReturnType<typeof supabase.channel>;

export function hasRealtime() {
  return typeof supabase.channel === "function" && typeof supabase.removeChannel === "function";
}

export function createRealtimeChannel(name: string): RealtimeChannel | null {
  if (!hasRealtime()) return null;
  return supabase.channel(name);
}

export function removeRealtimeChannel(channel: RealtimeChannel | null) {
  if (!channel || typeof supabase.removeChannel !== "function") return;
  supabase.removeChannel(channel);
}