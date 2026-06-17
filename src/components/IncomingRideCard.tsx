import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listAvailableRidesForDriver } from "@/lib/driver.functions";
import { acceptRide } from "@/lib/rotamais.functions";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, Star, X } from "lucide-react";
import { toast } from "sonner";

type Passenger = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  rating: number | null;
  total_rides: number | null;
} | null;

type Ride = {
  id: string;
  passenger_id: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  distance_km: number | null;
  duration_min: number | null;
  estimated_fare: number | null;
  vehicle_category: string | null;
  payment_method: string | null;
  requested_at: string;
  passenger: Passenger;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Beep gerado em tempo de execução (sem assets externos)
function playAlert() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.22, 0.44].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now + t);
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.4, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    });
    if ("vibrate" in navigator) navigator.vibrate?.([180, 90, 180, 90, 180]);
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    /* noop */
  }
}

export function IncomingRideCard({
  onAccepted,
  enabled = true,
}: {
  onAccepted: (rideId: string) => void;
  enabled?: boolean;
}) {
  const listFn = useServerFn(listAvailableRidesForDriver);
  const acceptFn = useServerFn(acceptRide);
  const [queue, setQueue] = useState<Ride[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    listFn()
      .then((r) => {
        if (!active) return;
        const list = (r ?? []) as Ride[];
        list.forEach((x) => seen.current.add(x.id));
        setQueue(list);
      })
      .catch(() => {});

    const ch = supabase
      .channel("driver-incoming-rides")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides", filter: "status=eq.requested" },
        async () => {
          // Refaz a lista para já trazer o perfil do passageiro
          const r = (await listFn().catch(() => [])) as Ride[];
          setQueue((cur) => {
            const newOnes = r.filter((x) => !seen.current.has(x.id));
            if (newOnes.length) playAlert();
            newOnes.forEach((x) => seen.current.add(x.id));
            const merged = [...cur];
            newOnes.forEach((x) => merged.push(x));
            return merged.filter((x) => !declined.has(x.id));
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides" },
        (payload) => {
          const r = payload.new as any;
          if (r.status !== "requested" || r.driver_id) {
            setQueue((cur) => cur.filter((x) => x.id !== r.id));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [listFn, enabled, declined]);

  const current = useMemo(() => queue.find((r) => !declined.has(r.id)) ?? null, [queue, declined]);

  if (!current) return null;
  const p = current.passenger;
  const initials = (p?.full_name ?? "U R")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function accept() {
    if (!current) return;
    setAccepting(true);
    try {
      await acceptFn({ data: { ride_id: current.id } });
      toast.success("Corrida aceita!");
      onAccepted(current.id);
      setQueue((cur) => cur.filter((x) => x.id !== current.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aceitar");
    } finally {
      setAccepting(false);
    }
  }

  function decline() {
    if (!current) return;
    setDeclined((s) => {
      const n = new Set(s);
      n.add(current.id);
      return n;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 backdrop-blur-sm animate-in fade-in">
      <div className="mx-auto w-full max-w-2xl rounded-t-3xl bg-card p-5 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl animate-in slide-in-from-bottom-6">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

        <div className="flex items-center gap-3">
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <div className="grid size-14 place-items-center rounded-full bg-secondary text-lg font-extrabold text-primary">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{p?.full_name ?? "Passageiro"}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-foreground">{Number(p?.rating ?? 5).toFixed(2)}</span>
              <span>· {p?.total_rides ?? 0} corridas</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold leading-none">
              {BRL.format(Number(current.estimated_fare ?? 0))}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {current.payment_method ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-3 text-center text-xs">
          <Metric label="Distância" value={current.distance_km ? `${current.distance_km.toFixed(1)} km` : "—"} />
          <Metric label="Duração" value={current.duration_min ? `${Math.round(current.duration_min)} min` : "—"} />
          <Metric label="Categoria" value={current.vehicle_category ?? "Padrão"} />
        </div>

        <div className="mt-4 space-y-2">
          <Row icon={<MapPin className="size-4 text-emerald-500" />} label="Embarque" text={current.origin_address} />
          <div className="ml-2 h-4 w-px border-l border-dashed border-border" />
          <Row icon={<MapPin className="size-4 text-amber-500" />} label="Destino" text={current.destination_address} />
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="h-14 flex-1 text-sm font-bold" onClick={decline} disabled={accepting}>
            <X className="size-4" /> Recusar
          </Button>
          <Button className="h-14 flex-[2] text-base font-extrabold" onClick={accept} disabled={accepting}>
            {accepting ? <Loader2 className="size-5 animate-spin" /> : <Navigation className="size-5" />}
            {accepting ? "Aceitando" : "Aceitar corrida"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold">{value}</p>
    </div>
  );
}

function Row({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{text}</p>
      </div>
    </div>
  );
}
