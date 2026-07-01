import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

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
      // 1. Tenta getSession (pode falhar se o cliente Supabase não tiver recuperado a sessão do storage)
      let { data } = await supabase.auth.getSession();
      token = data.session?.access_token;

      // 2. Se falhou, getUser() força a recuperação da sessão do storage (chama _recoverSession internamente)
      if (!token) {
        await supabase.auth.getUser();
        const retry = await supabase.auth.getSession();
        token = retry.data.session?.access_token;
      }

      // 3. Refresh se expirado
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
