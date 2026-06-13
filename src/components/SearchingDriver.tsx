import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { updateRideStatus } from "@/lib/rotamais.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

type Ride = {
  id: string;
  status: string;
  driver_id: string | null;
  estimated_fare: number | null;
};

type DriverInfo = {
  full_name: string | null;
  rating: number;
  vehicle?: { brand: string; model: string; color: string | null; plate: string } | null;
};

export function SearchingDriver({
  rideId,
  onCancelled,
  onCompleted,
}: {
  rideId: string;
  onCancelled: () => void;
  onCompleted: () => void;
}) {
  const cancelFn = useServerFn(updateRideStatus);
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch inicial + subscribe
  useEffect(() => {
    let active = true;
    supabase
      .from("rides")
      .select("id,status,driver_id,estimated_fare")
      .eq("id", rideId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setRide(data as Ride);
      });

    const ch = supabase
      .channel(`ride-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => {
          setRide(payload.new as Ride);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [rideId]);

  // Quando aceito, busca dados do motorista
  useEffect(() => {
    if (!ride?.driver_id) return;
    let active = true;
    (async () => {
      const [{ data: profile }, { data: driver }, { data: vehicles }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", ride.driver_id!).maybeSingle(),
        supabase.from("drivers").select("rating").eq("id", ride.driver_id!).maybeSingle(),
        supabase
          .from("vehicles")
          .select("brand,model,color,plate")
          .eq("driver_id", ride.driver_id!)
          .eq("is_active", true)
          .limit(1),
      ]);
      if (!active) return;
      setDriverInfo({
        full_name: profile?.full_name ?? "Motorista",
        rating: Number(driver?.rating ?? 5),
        vehicle: vehicles?.[0] ?? null,
      });
    })();
    return () => {
      active = false;
    };
  }, [ride?.driver_id]);

  useEffect(() => {
    if (ride?.status === "completed") onCompleted();
    if (ride?.status === "cancelled") onCancelled();
  }, [ride?.status, onCancelled, onCompleted]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelFn({
        data: { ride_id: rideId, status: "cancelled", cancel_reason: "passenger_cancelled" },
      });
      onCancelled();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar");
    } finally {
      setCancelling(false);
    }
  }

  const waiting = !ride?.driver_id || ride.status === "requested";

  if (waiting) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto grid size-16 place-items-center">
          <div className="relative size-6">
            <span className="rm-pulse absolute inset-0 block size-6 rounded-full" />
            <span className="relative z-10 block size-6 rounded-full bg-primary" />
          </div>
        </div>
        <p className="mt-4 text-base font-bold">Procurando motoristas próximos…</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Avisamos assim que alguém aceitar.
        </p>
        <Button
          variant="outline"
          className="mt-6 h-10 px-6 text-sm"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? <Loader2 className="size-4 animate-spin" /> : "Cancelar pedido"}
        </Button>
      </div>
    );
  }

  const initials = (driverInfo?.full_name ?? "M")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const statusLabel =
    ride?.status === "driver_arrived"
      ? "Motorista chegou"
      : ride?.status === "in_progress"
        ? "Em viagem"
        : "Motorista a caminho";

  return (
    <div>
      <span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-secondary">
        {statusLabel}
      </span>
      <div className="mt-4 flex items-center gap-3">
        <div className="grid size-14 place-items-center rounded-full bg-secondary text-primary text-lg font-extrabold">
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-base font-bold">{driverInfo?.full_name ?? "Motorista"}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-primary text-primary" />
            {driverInfo?.rating?.toFixed(2) ?? "5.00"}
            {driverInfo?.vehicle
              ? ` · ${driverInfo.vehicle.brand} ${driverInfo.vehicle.model}${driverInfo.vehicle.color ? ` ${driverInfo.vehicle.color}` : ""}`
              : ""}
          </p>
        </div>
        {driverInfo?.vehicle && (
          <div className="rounded-lg bg-muted px-3 py-1.5 text-xs font-extrabold tracking-widest">
            {driverInfo.vehicle.plate}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        className="mt-4 h-10 w-full text-xs"
        onClick={handleCancel}
        disabled={cancelling || ride?.status === "in_progress"}
      >
        {cancelling ? <Loader2 className="size-4 animate-spin" /> : "Cancelar corrida"}
      </Button>
    </div>
  );
}
