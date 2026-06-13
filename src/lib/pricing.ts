// Tabela de tarifas RotaMais — referência: média Uber/99 BR, com 10% de desconto.
export type VehicleCategory = "x" | "comfort" | "xl" | "pet";

export type CategoryInfo = {
  id: VehicleCategory;
  name: string;
  description: string;
  capacity: number;
  base: number; // bandeirada
  perKm: number;
  perMin: number;
  minimum: number;
  eta: number; // minutos estimados até chegar
};

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "x",
    name: "RotaX",
    description: "Econômico, o mais barato",
    capacity: 4,
    base: 5.4,
    perKm: 1.53,
    perMin: 0.27,
    minimum: 7.2,
    eta: 4,
  },
  {
    id: "comfort",
    name: "RotaConfort",
    description: "Carros novos e espaçosos",
    capacity: 4,
    base: 6.3,
    perKm: 1.98,
    perMin: 0.36,
    minimum: 9.0,
    eta: 6,
  },
  {
    id: "xl",
    name: "RotaXL",
    description: "Até 6 passageiros",
    capacity: 6,
    base: 7.2,
    perKm: 2.52,
    perMin: 0.45,
    minimum: 11.7,
    eta: 8,
  },
  {
    id: "pet",
    name: "RotaPet / Moto",
    description: "Pet a bordo ou entrega rápida",
    capacity: 1,
    base: 4.5,
    perKm: 1.17,
    perMin: 0.18,
    minimum: 6.3,
    eta: 3,
  },
];

export function estimateFare(cat: CategoryInfo, distanceKm: number, durationMin: number) {
  const raw = cat.base + distanceKm * cat.perKm + durationMin * cat.perMin;
  return Math.max(cat.minimum, Number(raw.toFixed(2)));
}
