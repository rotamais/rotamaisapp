## Problema

No passo 2 do onboarding do motorista (Veículo), ao clicar em **Continuar** nada acontece: os dados não são gravados e não avança para o passo 3 (Documentos).

## Diagnóstico provável

Revisando `src/components/DriverOnboarding.tsx` + `src/lib/driver.functions.ts` + RLS/schema do banco, as causas mais prováveis são:

1. **Validação Zod silenciosamente falhando no cliente**: o schema exige `license_number.min(3)` e `plate.min(5)`, mas o botão do passo 1/2 só checa "não vazio". Se faltar algo, o `parse` lança e cai no `catch` — o `toast.error` aparece muito rápido / fora da viewport, dando a impressão de que "nada acontece".
2. **Erro do servidor sem mensagem visível**: o `toast.error` usa apenas `e.message`, e erros do TanStack server-fn às vezes chegam como objeto genérico (sem `instanceof Error`), exibindo "Erro ao salvar" sem detalhe — ou simplesmente sem nenhum toast se o erro for um `Response`.
3. **Campo `year` opcional enviado como `NaN`** quando o usuário digita e apaga: `Number("")` → `0`, mas `year ? Number(year) : undefined` cobre isso. OK.
4. **`updated_at` em `drivers` sem trigger** — não bloqueia o update, então descartado.

RLS, GRANTs e colunas das tabelas `drivers` e `vehicles` estão corretos (verificado via `pg_policies` e `information_schema.columns`). O problema é frontend/handling.

## Plano

### 1. Endurecer e dar feedback na validação (frontend)

Em `src/components/DriverOnboarding.tsx`:

- Passo 1: bloquear "Continuar" enquanto `licenseNumber.length < 3`; mostrar mensagem inline ("CNH deve ter ao menos 3 caracteres") quando inválido após blur.
- Passo 2: bloquear "Continuar" enquanto `plate.replace(/\s/g,'').length < 5`; mostrar mensagem inline ("Placa inválida").
- Normalizar `plate` removendo espaços/hífen antes de enviar.

### 2. Tornar erros do servidor sempre visíveis

No `handleStep2` (e também no `handleUpload`):

```ts
} catch (e: any) {
  const msg =
    e?.message ??
    e?.error?.message ??
    (typeof e === "string" ? e : JSON.stringify(e));
  console.error("[onboarding] submit error", e);
  toast.error(`Erro ao salvar: ${msg}`);
}
```

Assim qualquer falha de rede / Zod / RLS aparece com texto.

### 3. Server function: mensagens mais úteis

Em `src/lib/driver.functions.ts` → `submitDriverOnboarding`:

- Antes do `update` em `drivers`, garantir que existe a row (motorista pode ter sido criado antes da migration); se `select` retornar `null`, fazer `insert` com `id = userId` e os campos do onboarding em vez de `update`. Isto evita o caso silencioso onde `update().eq("id", userId)` afeta 0 linhas e o handler retorna `ok` sem realmente persistir.
- Detectar `update` que afetou 0 linhas (usando `.select()` + checagem do array) e lançar erro explícito: "Cadastro de motorista não encontrado".
- Retornar erro 409 amigável quando a placa já existe para outro motorista (`23505`).

### 4. Verificação rápida pós-fix

Após aplicar:
1. Abrir o preview, fazer cadastro como motorista, preencher CNH e veículo, clicar Continuar.
2. Confirmar no log do server fn que `submitDriverOnboarding` retornou `{ ok: true, vehicle_id: ... }`.
3. Confirmar que o passo 3 (Documentos) aparece e que aparecem registros em `public.drivers` (license_number preenchido) e `public.vehicles` (uma linha com `driver_id = auth.uid()`).

## Arquivos afetados

- `src/components/DriverOnboarding.tsx` — validação + handler de erro.
- `src/lib/driver.functions.ts` — upsert seguro + mensagens explícitas.

Nenhuma migração nova; nenhuma alteração em RLS, schemas ou políticas.
