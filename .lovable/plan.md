# Plano: Mapa real + simulação de corrida com categorias

## 1. Conectar Google Maps Platform
Usar o connector oficial (Maps JavaScript API + Places API New + Routes API + Geocoding via gateway). A chave de browser (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) é injetada automaticamente — apenas com isso conseguimos: mapa real, autocomplete de endereço, geolocalização reversa e cálculo de rota/distância/tempo.

Se preferir, posso usar a conexão gerenciada do Lovable (sem custo de setup para você).

## 2. Substituir `MapMock` por mapa real
Novo componente `RealMap.tsx`:
- carrega o script Maps JS de forma assíncrona com callback;
- renderiza `google.maps.Map` com tema escuro/minimal alinhado ao visual amarelo/preto;
- marcadores `google.maps.Marker` para origem, destino e (mock) motoristas próximos;
- desenha a rota com `DirectionsRenderer` (dados vindos da Routes API).

## 3. Botão "Buscar destino" → geolocalização
- Ao tocar em "Buscar destino" pedimos `navigator.geolocation.getCurrentPosition`.
- Centralizamos o mapa nessa coordenada e fazemos reverse geocoding (Geocoding API via gateway, em server function) para preencher o campo "Origem" com o endereço real.
- Tratamento de permissão negada com toast e fallback para entrada manual.

## 4. Autocomplete de destino
- Campo de destino usa Places API (New) — `AutocompleteSuggestion.fetchAutocompleteSuggestions` com session token.
- Ao escolher uma sugestão buscamos o `place details` (lat/lng + endereço formatado).

## 5. Cálculo real de distância/tempo
Server function `estimateRide` que chama a Routes API (`routes:computeRoutes`) pelo gateway e retorna `distance_km`, `duration_min` e a polyline da rota.

## 6. Categorias de veículo e simulação de preço
Nova etapa "select" antes de "Solicitar corrida", mostrando cards com 4 categorias (referência: tabela média de Uber/99 no Brasil **com 10% de desconto**):

| Categoria | Bandeirada | R$/km | R$/min | Mínimo |
|---|---|---|---|---|
| RotaX (econômico)   | R$ 5,40 | R$ 1,53 | R$ 0,27 | R$ 7,20 |
| RotaConfort         | R$ 6,30 | R$ 1,98 | R$ 0,36 | R$ 9,00 |
| RotaXL (até 6 pax)  | R$ 7,20 | R$ 2,52 | R$ 0,45 | R$ 11,70 |
| RotaPet / Moto      | R$ 4,50 | R$ 1,17 | R$ 0,18 | R$ 6,30 |

Fórmula: `fare = max(minimo, bandeirada + km*valor_km + min*valor_min)` + ajuste pela `platform_fee_percent` da tabela `platform_settings`.

Constantes em `src/lib/pricing.ts` (puro client, sem custo extra de chamada). O usuário vê as 4 opções com tempo/preço calculados ao mesmo tempo, escolhe uma e só então o botão "Solicitar corrida" envia `vehicle_category` + `estimated_fare` para o `requestRide` atual.

## 7. Banco de dados
Adicionar coluna `vehicle_category text` em `rides` (valores: `x | comfort | xl | pet`). Sem mudança de policies.

## 8. Arquivos a alterar/criar
- `src/components/RealMap.tsx` (novo)
- `src/components/VehicleCategoryPicker.tsx` (novo)
- `src/lib/pricing.ts` (novo, fórmula + tabela)
- `src/lib/maps.functions.ts` (novo: `reverseGeocode`, `computeRoute`)
- `src/routes/_authenticated/home.tsx` (novo fluxo: idle → destino+autocomplete → escolher categoria → solicitar → buscando → matched)
- `src/lib/rotamais.functions.ts` (aceitar `vehicle_category`)
- migração SQL adicionando `vehicle_category` em `rides`

## Pergunta antes de implementar
1. Posso conectar a integração gerenciada do Google Maps Platform agora? (Sem isso o mapa real não funciona.)
2. Confirma as 4 categorias acima (RotaX / Confort / XL / Pet-Moto) ou prefere outro conjunto?