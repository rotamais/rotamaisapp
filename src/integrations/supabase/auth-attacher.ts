import { createMiddleware } from "@tanstack/react-start";
import { supabase, getSupabaseSessionFromStorage } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;

    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;

      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.exp && payload.exp * 1000 < Date.now()) {
          const refreshed = await supabase.auth.refreshSession();
          token = refreshed.data.session?.access_token;
        }
      }

      if (!token) {
        token = getSupabaseSessionFromStorage();
      }
    } catch {
      token = getSupabaseSessionFromStorage();
    }

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
