import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

function readSessionFromStorage(): { access_token: string; refresh_token: string } | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.access_token && typeof parsed.access_token === "string") {
          return {
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token ?? "",
          };
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return !!(payload?.exp && payload.exp * 1000 < Date.now());
  } catch {
    return true;
  }
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;

    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;

      if (!token) {
        const stored = readSessionFromStorage();
        if (stored) {
          const { data: restored } = await supabase.auth.setSession(stored);
          token = restored.session?.access_token;
        }
      }

      if (token && isTokenExpired(token)) {
        const refreshed = await supabase.auth.refreshSession();
        token = refreshed.data.session?.access_token;
      }
    } catch {
      token = undefined;
    }

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
