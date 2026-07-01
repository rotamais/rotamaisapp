import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/supabase-realtime";
import { listAvailableRides, acceptRide } from "@/lib/rotamais.functions";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

type Ride = {
  id: string;
  origin_address: string;
  destination_address: string;
  distance_km: number | null;
  estimated_fare: number | null;
  vehicle_category: string | null;
  requested_at: string;
};

export function AvailableRidesList({ onAccepted }: { onAccepted: (rideId: string) => void }) {
  const listFn = useServerFn(listAvailableRides);
  const acceptFn = useServerFn(acceptRide);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listFn()
      .then((r) => active && setRides((r ?? []) as Ride[]))
      .finally(() => active && setLoading(false));

    const ch = createRealtimeChannel("available-rides");
    ch
      ?.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides", filter: "status=eq.requested" },
        (payload: any) => {
          const r = payload.new as Ride;
          setRides((cur) => (cur.find((x) => x.id === r.id) ? cur : [r, ...cur]));
        },
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rides" }, (payload: any) => {
        const r = payload.new as any;
        // Sai da lista se já foi pega ou cancelada
        if (r.status !== "requested" || r.driver_id) {
          setRides((cur) => cur.filter((x) => x.id !== r.id));
        }
      })
      .subscribe();

    return () => {
      active = false;
      removeRealtimeChannel(ch);
    };
  }, [listFn]);

  async function handleAccept(id: string) {
    setAccepting(id);
    try {
      await acceptFn({ data: { ride_id: id } });
      toast.success("Corrida aceita!");
      onAccepted(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aceitar");
    } finally {
      setAccepting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="text-sm font-semibold">Aguardando pedidos</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Você está visível para passageiros próximos.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rides.map((r) => (
        <li key={r.id} className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {r.vehicle_category ?? "Padrão"}
              </p>
              <p className="mt-1 flex items-center gap-1 truncate text-sm font-semibold">
                <MapPin className="size-3 text-emerald-400" /> {r.origin_address}
              </p>
              <p className="flex items-center gap-1 truncate text-sm font-semibold">
                <MapPin className="size-3 text-amber-400" /> {r.destination_address}
              </p>
              <p className="mt-1 text-[11px] opacity-70">
                {r.distance_km ? `${Number(r.distance_km).toFixed(1)} km · ` : ""}R${" "}
                {Number(r.estimated_fare ?? 0).toFixed(2)}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleAccept(r.id)}
              disabled={accepting === r.id}
              className="h-9 shrink-0"
            >
              {accepting === r.id ? <Loader2 className="size-4 animate-spin" /> : "Aceitar"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
