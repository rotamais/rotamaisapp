## Diagnóstico

O arquivo `.env` já contém todas as variáveis que você listou (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`). No Lovable Cloud, o `.env` é gerenciado automaticamente — inserir/alterar valores lá não resolveria e ainda pode ser sobrescrito. A `SUPABASE_SERVICE_ROLE_KEY` fica exclusivamente como secret do backend (não vai no `.env` do repositório) e já está configurada.

O login em si está funcionando (logs de auth mostram Google OIDC `status 200` para o seu usuário). O problema "refresh desloga" está no código de autenticação:

1. **OAuth Google**: após o Google redirecionar de volta para `/auth`, a URL contém os tokens no hash. Mas o cliente Supabase usa um `Proxy` que só instancia na primeira chamada a `supabase.auth.*`. Na página `/auth` recém-carregada nenhum código toca `supabase.auth` no mount, então o `detectSessionInUrl` do Supabase nunca roda — o hash é descartado sem gravar sessão no `localStorage`. No próximo refresh não há sessão.
2. **Falta um `onAuthStateChange` no root**: sem ele, quando o Supabase termina de hidratar tokens (assíncrono), o Router não é invalidado e o `beforeLoad` de `_authenticated` pode rodar antes da sessão existir → redirect para `/auth`.
3. **`handleGoogle` tem um fallback para `supabase.auth.signInWithOAuth` direto** que fere as regras do Lovable Cloud (deve usar só o broker `lovable.auth`) e mascara erros reais.

## Correções

### 1. `src/routes/auth.tsx`
- No mount da página, forçar a hidratação de sessão do hash chamando `supabase.auth.getSession()` dentro de um `useEffect`. Se a sessão existir logo depois, navegar para o destino do usuário (`routeByRole()`).
- Remover o fallback direto `supabase.auth.signInWithOAuth("google", …)` do `handleGoogle` (deixar só o `lovable.auth`).
- Mudar o `redirect_uri` para `window.location.origin` (raiz), mantendo apenas o helper pra decidir destino no `onAuthStateChange`.

### 2. `src/routes/__root.tsx`
- Adicionar (dentro de `RootComponent`) um `useEffect` client-only registrando `supabase.auth.onAuthStateChange`, filtrando `SIGNED_IN` / `SIGNED_OUT` / `USER_UPDATED` e chamando `router.invalidate()` + `queryClient.invalidateQueries()` (mas não em `SIGNED_OUT`, para não gerar 401 storm).
- Isso garante que, assim que o Supabase termina de processar o hash OAuth ou o `signInWithPassword`, a árvore de rotas re-avalia o `beforeLoad` do `_authenticated` com sessão válida.

### 3. `src/integrations/supabase/client.ts` (arquivo auto-gerado — só tocar se necessário)
- Não vou editar. Já usa `persistSession: true` + `localStorage` e cai no fallback só quando as VITE_ vars estão ausentes (não é o caso).

### 4. `.env`
- **Não alterar.** O Lovable Cloud regenera esse arquivo; suas 6 variáveis já estão lá. A `SUPABASE_SERVICE_ROLE_KEY` fica só como secret do backend e não é exibida no editor por segurança.

## Verificação

Após implementar:
1. Rodar Playwright contra `http://localhost:8080/auth`, logar com email/senha de teste, dar refresh na `/home` e confirmar que a sessão persiste.
2. Screenshot da tela após refresh mostrando o usuário ainda logado.
3. Rever logs do console para garantir que não há loop de `onAuthStateChange`.

Depois do OK, publicar novamente para propagar em `rotamaisapp.lovable.app`.
