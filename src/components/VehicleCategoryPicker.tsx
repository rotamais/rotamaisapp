import { CATEGORIES, estimateFare, type VehicleCategory } from "@/lib/pricing";
import { Car, Crown, Dog, Users } from "lucide-react";

const ICONS: Record<VehicleCategory, React.ReactNode> = {
  x: <Car className="size-5" />,
  comfort: <Crown className="size-5" />,
  xl: <Users className="size-5" />,
  pet: <Dog className="size-5" />,
};

export function VehicleCategoryPicker({
  distanceKm,
  durationMin,
  selected,
  onSelect,
}: {
  distanceKm: number;
  durationMin: number;
  selected: VehicleCategory | null;
  onSelect: (id: VehicleCategory, fare: number) => void;
}) {
  return (
    <div className="space-y-2">
      {CATEGORIES.map((c) => {
        const fare = estimateFare(c, distanceKm, durationMin);
        const isSel = selected === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id, fare)}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
              isSel ? "border-primary bg-primary/10" : "border-border bg-background"
            }`}
          >
            <span className="grid size-10 place-items-center rounded-lg bg-muted text-secondary">
              {ICONS[c.id]}
            </span>
            <span className="flex-1">
              <span className="flex items-center justify-between">
                <span className="text-sm font-bold">{c.name}</span>
                <span className="text-sm font-extrabold">R$ {fare.toFixed(2)}</span>
              </span>
              <span className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{c.description}</span>
                <span>{c.eta} min</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
