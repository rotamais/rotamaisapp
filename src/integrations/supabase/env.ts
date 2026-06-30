type SupabaseRuntimeEnv = Record<string, string | boolean | undefined>;

export function getSupabaseEnv() {
  const runtimeEnv = (typeof import.meta !== "undefined"
    ? ((import.meta as ImportMeta & { env?: SupabaseRuntimeEnv }).env ?? {})
    : {}) as SupabaseRuntimeEnv;
  const processEnv = (typeof process !== "undefined" ? process.env ?? {} : {}) as Record<
    string,
    string | undefined
  >;

  return {
    url: (runtimeEnv.VITE_SUPABASE_URL as string | undefined) ?? processEnv.SUPABASE_URL ?? processEnv.VITE_SUPABASE_URL,
    publishableKey:
      (runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
      processEnv.SUPABASE_PUBLISHABLE_KEY ??
      processEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey:
      (runtimeEnv.SUPABASE_SERVICE_ROLE_KEY as string | undefined) ??
      processEnv.SUPABASE_SERVICE_ROLE_KEY ??
      (runtimeEnv.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined) ??
      processEnv.VITE_SUPABASE_SERVICE_ROLE_KEY,
  };
}
