## Causa

O erro `Unauthorized: Invalid token` vem do middleware do servidor (`src/integrations/supabase/auth-middleware.ts`), que rejeita o Bearer enviado pela chamada `submitDriverOnboarding`. Investigando o fluxo:

1. `src/integrations/supabase/client.ts` está criando o cliente com `autoRefreshToken: false`. Como o access token do Supabase expira em ~1h, qualquer sessão parada por mais que isso guarda um token vencido no `localStorage`.
2. `src/integrations/supabase/auth-attacher.ts` (o middleware que anexa o `Authorization`) pega o token via `supabase.auth.getSession()` — que, com `autoRefreshToken: false`, devolve o token vencido sem tentar renovar. Ele só tenta `refreshSession()` num `try/catch` interno onde a expiração é decodificada, mas basta um erro silencioso ali para o token vencido seguir para o servidor.
3. No servidor, `getClaims(token)` + fallback `supabaseAdmin.auth.getUser(token)` falham e o middleware lança `Unauthorized: Invalid token`. Como o botão "Salvar" faz a chamada só depois de o usuário passar tempo preenchendo o formulário, é o caminho mais fácil de o token expirar antes do submit.

Esse mesmo problema explica o sintoma anterior de "refresh me desloga": sem auto-refresh, qualquer aba aberta por mais de 1h perde a sessão.

## Correções

### 1. `src/integrations/supabase/client.ts`
Ligar `autoRefreshToken: true` na criação do cliente real (mantendo o fallback local intacto). O arquivo tem cabeçalho de "auto-gerado" mas já foi customizado com `createFallbackClient`, então esta linha específica é ajuste local seguro.

```ts
return createClient<Database>(url, publishableKey, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true, // era false — causa do token vencido
  },
});
```

### 2. `src/integrations/supabase/auth-attacher.ts`
Reforçar para nunca mandar um token vencido:

- Antes de anexar, se o token decodificado tem `exp` faltando OU expira em menos de 60 s, chamar `supabase.auth.refreshSession()` e usar o novo `access_token`.
- Se a renovação falhar OU se, após tudo, o token continuar vencido, **não** enviar o header `Authorization` (em vez de mandar um Bearer inválido). Assim o servidor devolve 401 limpo e a UI pode reagir pedindo novo login, em vez do erro genérico "Invalid token".
- Manter o fallback `readAccessToken()` apenas como último recurso, e aplicar a mesma checagem de expiração antes de anexar.

### 3. Verificação
- Reproduzir com Playwright: logar, esperar >1h de sessão simulando expiração via `localStorage`, tentar salvar o cadastro de motorista e confirmar que:
  - o attacher renova o token, e
  - o servidor aceita e devolve 200 (motorista salvo, vai para o passo de documentos).
- Se a renovação falhar, verificar que a UI mostra "Sessão expirada" em vez de "Invalid token".

Sem esse fix, qualquer chamada autenticada continuará quebrando após ~1h de sessão inativa, não só o "Salvar tipo de carro".
