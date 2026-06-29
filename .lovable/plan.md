**Objetivo:** Corrigir o schema Zod no `src/lib/driver.functions.ts` para aceitar qualquer ano válido de veículo sem rejeição.

**Problema:** A validação `.max(new Date().getFullYear() + 1)` no campo `vehicle.year` está falhando em ambiente serverless porque `new Date()` pode retornar o epoch (1970), resultando em `max = 1971`. Isso rejeita anos reais como 2015, 2020, etc.

**Solução:** Substituir `.max(new Date().getFullYear() + 1)` por `.max(2100)` no schema `onboardingSchema`.

**Arquivo:** `src/lib/driver.functions.ts` (linha 14)

**Alteração:**

```diff
- year: z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
+ year: z.number().int().min(1980).max(2100).optional(),
```

**Validação:** Verificar se o build passa após a alteração.
