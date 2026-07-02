import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const candidates: string[] = [];
  const addToken = (value: unknown) => {
    if (typeof value === "string" && value.split(".").length === 3 && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  try {
    // 1. Chave padrão do Supabase: sb-<project_ref>-auth-token
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          addToken(parsed?.access_token ?? parsed?.session?.access_token);
        }
        break;
      }
    }

    // 2. Backup salvo pelo Lovable OAuth
    const backup = window.localStorage.getItem("rotamais-auth-tokens");
    if (backup) {
      const parsed = JSON.parse(backup);
      addToken(parsed?.access_token ?? parsed?.session?.access_token);
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
        addToken(at);
      } catch {}
    }
  } catch {}
  return candidates.find((candidate) => !isExpiredOrExpiring(candidate, 0)) ?? candidates[0] ?? null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isExpiredOrExpiring(token: string, skewSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (typeof payload?.exp !== "number") return true;
  return payload.exp * 1000 - Date.now() < skewSeconds * 1000;
}

let verifiedToken: string | undefined;
let verifiedAt = 0;

async function refreshAccessToken(): Promise<string | undefined> {
  try {
    const refreshed = await supabase.auth.refreshSession();
    const token = refreshed.data?.session?.access_token;
    return token && !isExpiredOrExpiring(token, 0) ? token : undefined;
  } catch {
    return undefined;
  }
}

async function verifyOrRefreshToken(token: string | undefined): Promise<string | undefined> {
  if (!token) return undefined;

  if (isExpiredOrExpiring(token)) {
    return refreshAccessToken();
  }

  const now = Date.now();
  if (verifiedToken === token && now - verifiedAt < 30_000) {
    return token;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      verifiedToken = token;
      verifiedAt = now;
      return token;
    }
  } catch {
    /* try refreshing below */
  }

  const freshToken = await refreshAccessToken();
  if (freshToken) {
    verifiedToken = freshToken;
    verifiedAt = Date.now();
  }
  return freshToken;
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

    // Never send stale/revoked tokens to protected server functions.
    token = await verifyOrRefreshToken(token);

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
