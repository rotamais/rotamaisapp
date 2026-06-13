# Sair do modo simulação

Objetivo: ativar fluxos reais de cadastro de passageiro, cadastro/onboarding de motorista, dashboard do motorista e match de corridas — sem dados mock. A simulação de preço (tabela de tarifas baseada em concorrentes −10%) é mantida.

## 1. Confirmação de e-mail
- Ativar **auto-confirm** no Lovable Cloud (sem precisar abrir o e-mail).
- Sign-up já loga o usuário direto.

## 2. Cadastro de passageiro
- Já funciona: o trigger `handle_new_user` cria `profiles` + role `passenger`.
- Adicionar validação suave (telefone obrigatório, mensagem clara) e redirecionar para `/home`.

## 3. Cadastro / onboarding de motorista
Hoje o sign-up só insere role `passenger`. Vai mudar para:

- Quando o usuário escolher "Motorista" no signup, o `account_type='driver'` será lido no trigger:
  - Mantém role `passenger` (todo motorista também é passageiro).
  - **Adiciona role `driver`**.
  - Insere linha em `public.drivers` com `is_verified=false`, `is_suspended=false`, `is_online=false`.
- Após login, se o usuário tem role `driver` e ainda não foi aprovado, é levado para a tela **Onboarding do motorista** (`/driver`), com 3 passos:
  1. Dados da CNH (`license_number`, `license_category`, validade).
  2. Cadastro do veículo (placa, modelo, ano, cor, categoria — usado para casar com `vehicle_category` do pedido).
  3. Upload de documentos: CNH (frente/verso), CRLV, foto do veículo. Vai para o bucket `documents` (privado) e cria registros em `public.documents` com `verified=false`.
- Banner persistente "Cadastro em análise" até `drivers.is_verified=true`. Botão "Ficar online" fica desabilitado nesse estado.
- A aprovação acontece no painel `/admin` (já existe `adminApproveDriver` + `adminVerifyDocument`).

## 4. Dashboard real do motorista (`/driver`)
Substituir todos os números/cards mockados por dados reais.

- **Mapa real**: trocar `MapMock` por `RealMap` (já existe), centrado na geolocalização atual.
- **Botão "Ficar online / offline"**: chama `updateDriverLocation({ lat, lng, is_online: true })` ao ativar; envia atualizações periódicas (a cada 15s) enquanto online; envia `is_online: false` ao desativar/desmontar. Desabilitado se `is_verified=false`.
- **Estatísticas reais**: nova server fn `getDriverStats` retornando, para o motorista logado:
  - Ganhos do dia (`SUM final_fare` em rides `completed` de hoje).
  - Nº de corridas hoje / semana.
  - Nota média (`drivers.rating` + count de `reviews`).
  - Barrinhas da semana = ganhos diários dos últimos 7 dias.
- **Corridas disponíveis em tempo real**: enquanto online, assinar canal Realtime na tabela `rides` filtrando `status=requested AND driver_id IS NULL`. Inicial via `listAvailableRides`. Cada item mostra origem/destino, distância e fare estimado. Botão "Aceitar" chama `acceptRide({ ride_id })`.

## 5. Match passageiro → motorista (fluxo real)
- `requestRide` (já existente) continua criando `rides.status='requested'`.
- Após criar, a tela do passageiro entra em estado **"Procurando motorista"** e assina Realtime no próprio `rides.id`. Quando `driver_id` for preenchido e `status='accepted'`, mostra dados do motorista (nome, foto, placa, nota, ETA).
- Botões: "Cancelar pedido" (chama `updateRideStatus` com `cancelled`).
- Quando `status` virar `in_progress` e depois `completed`, a UI atualiza e abre a tela de avaliação (`submitReview`).

## 6. Habilitar Realtime
Migration que adiciona `rides` e `drivers` à publicação `supabase_realtime` e configura `REPLICA IDENTITY FULL` para receber payloads completos.

## 7. Admin — pequenos ajustes
- Garantir que o painel `/admin` mostre claramente os motoristas pendentes (já existe via `adminListDrivers({ status: 'pending' })`) e o link para revisar documentos / aprovar.
- (Nenhuma mudança de regras de negócio; apenas confirmação visual.)

## Detalhes técnicos

**Migrations:**
- Atualizar `handle_new_user` para ler `raw_user_meta_data->>'account_type'` e, se `'driver'`, inserir em `public.user_roles` (role `driver`) e em `public.drivers (id)` com defaults.
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.rides, public.drivers;`
- `ALTER TABLE public.rides REPLICA IDENTITY FULL;` (idem `drivers`).

**Auth:**
- `supabase--configure_auth`: `auto_confirm_email=true`, sem mudar outros flags.

**Novas server fns (`src/lib/driver.functions.ts`):**
- `getDriverStats()` — agregados do motorista logado.
- `submitDriverOnboarding({ license_number, license_category, license_expires_at, vehicle: {...} })` — upsert em `drivers` e insert em `vehicles`.
- `uploadDriverDocument({ type, storage_path })` — registra em `public.documents` (o upload do arquivo em si vai direto do client para o bucket `documents`).

**Arquivos a criar/editar:**
- `src/routes/_authenticated/driver.tsx` — reescrever: detectar `is_verified`, mostrar onboarding ou dashboard real, integrar `RealMap`, Realtime de rides disponíveis.
- `src/components/DriverOnboarding.tsx` — wizard 3 passos.
- `src/components/AvailableRidesList.tsx` — lista em tempo real + aceitar.
- `src/routes/_authenticated/home.tsx` — após `requestRide`, abrir `SearchingDriver` que assina Realtime do ride criado.
- `src/components/SearchingDriver.tsx` — estado "procurando" → "motorista a caminho".
- `src/lib/driver.functions.ts` — novas fns.
- `supabase/migrations/...sql` — trigger atualizado + Realtime.
- `src/integrations/supabase/types.ts` — regenerado pela migration.

**Sem mudanças em:**
- `src/lib/pricing.ts` (simulação de preço fica).
- `src/lib/maps.functions.ts` / `RealMap.tsx` / `VehicleCategoryPicker.tsx`.
- RLS / segurança (mantemos as travas já aplicadas).
