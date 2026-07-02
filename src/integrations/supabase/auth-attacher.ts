import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // 1. Backup salvo pelo Lovable OAuth
    const backup = window.localStorage.getItem("rotamais-auth-tokens");
    if (backup) {
      const parsed = JSON.parse(backup);
      if (parsed?.access_token) return parsed.access_token;
    }

    // 2. Chave padrão do Supabase: sb-<project_ref>-auth-token
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token) return parsed.access_token;
        }
        break;
      }
    }

    // 3. Varredura geral: qualquer JSON com access_token JWT
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || key === "rotamais-auth-tokens") continue;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw || raw.length > 50000) continue;
        const parsed = JSON.parse(raw);
        const at = parsed?.access_token ?? parsed?.session?.access_token;
        if (at && typeof at === "string" && at.split(".").length === 3) {
          return at;
        }
      } catch {}
    }
  } catch {}
  return null;
}

function isExpiredOrExpiring(token: string, skewSeconds = 60): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return true;
    return payload.exp * 1000 - Date.now() < skewSeconds * 1000;
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
    } catch {
      /* fall through */
    }

    if (!token) {
      token = readAccessToken() ?? undefined;
    }

    // Proactively refresh if expired / about to expire
    if (token && isExpiredOrExpiring(token)) {
      try {
        const refreshed = await supabase.auth.refreshSession();
        const newToken = refreshed.data?.session?.access_token;
        if (newToken && !isExpiredOrExpiring(newToken, 0)) {
          token = newToken;
        } else {
          token = undefined; // don't send stale token
        }
      } catch {
        token = undefined;
      }
    }

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
