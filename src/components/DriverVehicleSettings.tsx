import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { updateDriverVehicle } from "@/lib/driver.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type Vehicle = {
  id: string;
  type: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  plate: string;
  seats: number;
  is_active: boolean;
};

export function DriverVehicleSettings({
  vehicle,
  onSaved,
}: {
  vehicle: Vehicle;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateDriverVehicle);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(vehicle.type);
  const [brand, setBrand] = useState(vehicle.brand);
  const [model, setModel] = useState(vehicle.model);
  const [year, setYear] = useState<string>(vehicle.year ? String(vehicle.year) : "");
  const [color, setColor] = useState(vehicle.color ?? "");
  const [plate, setPlate] = useState(vehicle.plate);
  const [seats, setSeats] = useState<string>(String(vehicle.seats));
  const [active, setActive] = useState(vehicle.is_active);

  async function save() {
    setLoading(true);
    try {
      await updateFn({
        data: {
          vehicle_id: vehicle.id,
          type: type as any,
          brand: brand.trim(),
          model: model.trim(),
          year: year ? Number(year) : null,
          color: color || null,
          plate: plate.trim(),
          seats: Number(seats) || 4,
          is_active: active,
        },
      });
      toast.success("Veículo atualizado");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="text-base font-extrabold">Configurações do veículo</h2>
        <p className="text-xs text-muted-foreground">
          Mudanças que afetem placa, marca ou modelo passam por nova revisão.
        </p>
      </div>

      <div>
        <Label htmlFor="vtype">Tipo</Label>
        <select
          id="vtype"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="car">Carro</option>
          <option value="motorcycle">Moto</option>
          <option value="van">Van</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="year">Ano</Label>
          <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="color">Cor</Label>
          <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="seats">Lugares</Label>
          <Input
            id="seats"
            type="number"
            min={1}
            max={8}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="plate">Placa</Label>
        <Input
          id="plate"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="ABC1D23"
        />
      </div>

      <label className="flex items-center justify-between rounded-xl border border-border p-3">
        <div>
          <p className="text-sm font-bold">Veículo ativo</p>
          <p className="text-[11px] text-muted-foreground">
            Desative para parar de receber corridas neste veículo.
          </p>
        </div>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-5 accent-primary"
        />
      </label>

      <Button onClick={save} disabled={loading} className="h-11 w-full text-sm font-bold">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <><Save className="size-4" /> Salvar alterações</>}
      </Button>
    </div>
  );
}
