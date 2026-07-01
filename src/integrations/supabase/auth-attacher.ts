import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

function readSessionFromStorage(): { access_token: string; refresh_token: string } | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      // Chave padrão do Supabase: sb-<project_ref>-auth-token
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.access_token) {
              return {
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token ?? "",
              };
            }
          } catch { /* skip malformed json */ }
        }
        continue;
      }

      // Fallback: busca qualquer valor JSON que contenha access_token
      // (cobre outros formatos de armazenamento do Supabase ou Lovable)
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw || raw.length > 50000) continue;
        const parsed = JSON.parse(raw);
        const at = parsed?.access_token ?? parsed?.session?.access_token;
        if (at && typeof at === "string" && at.split(".").length === 3) {
          return {
            access_token: at,
            refresh_token: parsed?.refresh_token ?? parsed?.session?.refresh_token ?? "",
          };
        }
      } catch {
        /* skip non-json keys */
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;

    // 1. Fast path: try current Supabase session
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      /* ignore – fall through to storage */
    }

    // 2. Recover token from localStorage if Supabase session is missing
    if (!token) {
      const stored = readSessionFromStorage();
      if (stored) {
        token = stored.access_token;

        // 3. Best-effort: hydrate Supabase internal state so refreshSession works later
        try {
          const result = await supabase.auth.setSession(stored);
          if (result.data?.session?.access_token) {
            token = result.data.session.access_token;
          }
        } catch {
          /* keep raw token from storage */
        }
      }
    }

    // 4. Best-effort: refresh an expired token
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          const refreshed = await supabase.auth.refreshSession();
          if (refreshed.data?.session?.access_token) {
            token = refreshed.data.session.access_token;
          }
        }
      } catch {
        /* keep existing token even if expired */
      }
    }

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
