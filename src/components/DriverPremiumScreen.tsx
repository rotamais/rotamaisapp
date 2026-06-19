import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation2,
  Phone,
  Power,
  Star,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DriverMenu } from "@/components/DriverMenu";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getDriverCurrentRide,
  getDriverStats,
  listAvailableRidesForDriver,
  triggerDriverSOS,
} from "@/lib/driver.functions";
import { acceptRide, updateDriverLocation, updateRideStatus } from "@/lib/rotamais.functions";
import { toast } from "sonner";

/* ===========================================================
 * Tela do motorista — dados reais do Supabase
 * =========================================================== */

type DriverState =
  | "offline"
  | "online"
  | "incoming"
  | "accepted"
  | "arrived"
  | "in_progress"
  | "completed";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type RidePassenger = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  rating: number | null;
  total_rides: number | null;
  phone?: string | null;
} | null;

type IncomingRide = {
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
  passenger: RidePassenger;
};

type CurrentRide = {
  id: string;
  passenger_id: string;
  status: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  distance_km: number | null;
  duration_min: number | null;
  estimated_fare: number | null;
  final_fare: number | null;
  vehicle_category: string | null;
  payment_method: string | null;
  passenger: RidePassenger;
};

/* ---------- helpers ---------- */
function playBeep() {
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
    if ("vibrate" in navigator) navigator.vibrate?.([180, 90, 180]);
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    /* noop */
  }
}

function rideStatusToDriverState(status?: string | null): DriverState | null {
  if (!status) return null;
  if (status === "accepted") return "accepted";
  if (status === "driver_arrived") return "arrived";
  if (status === "in_progress") return "in_progress";
  return null;
}

function openNavigation(lat?: number | null, lng?: number | null) {
  if (!lat || !lng) {
    toast.error("Sem coordenadas para navegação");
    return;
  }
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  window.open(url, "_blank", "noopener");
}

/* ===========================================================
 * Mapa SVG estilizado (placeholder visual leve)
 * =========================================================== */
function FakeMap({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1d1f24]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0v40" fill="none" stroke="#262a31" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="600" fill="url(#grid)" />
        <path d="M-20 180 L420 220" stroke="#3a3f48" strokeWidth="22" />
        <path d="M-20 380 L420 360" stroke="#3a3f48" strokeWidth="18" />
        <path d="M120 -20 L160 620" stroke="#3a3f48" strokeWidth="20" />
        <path d="M280 -20 L260 620" stroke="#3a3f48" strokeWidth="16" />
        {active && (
          <>
            <path d="M140 420 C 200 360, 220 300, 270 220" stroke="#FFC107" strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="140" cy="420" r="9" fill="#22c55e" stroke="#fff" strokeWidth="3" />
            <circle cx="270" cy="220" r="9" fill="#FFC107" stroke="#121212" strokeWidth="3" />
          </>
        )}
        <g transform={`translate(${active ? 140 : 200}, ${active ? 420 : 300})`}>
          <circle r="22" fill="#FFC107" opacity="0.18">
            <animate attributeName="r" values="18;30;18" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0;0.25" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle r="10" fill="#FFC107" stroke="#121212" strokeWidth="2" />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
    </div>
  );
}

/* ===========================================================
 * Botão SOS — chama central e compartilha localização atual
 * =========================================================== */
function SOSButton({ rideId }: { rideId?: string }) {
  const sosFn = useServerFn(triggerDriverSOS);
  const [busy, setBusy] = useState(false);

  async function trigger() {
    if (busy) return;
    setBusy(true);
    const send = async (lat: number, lng: number) => {
      try {
        await sosFn({ data: { lat, lng, ride_id: rideId } });
        toast.error("Central acionada — localização compartilhada", {
          description: "Suporte de emergência a caminho.",
        });
      } catch (e: any) {
        toast.error(e?.message ?? "Falha ao acionar SOS");
      } finally {
        setBusy(false);
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => send(p.coords.latitude, p.coords.longitude),
        () => send(0, 0),
        { enableHighAccuracy: true, timeout: 6000 },
      );
    } else {
      send(0, 0);
    }
  }

  return (
    <button
      onClick={trigger}
      disabled={busy}
      className="fixed right-4 top-[calc(env(safe-area-inset-top)+72px)] z-40 grid size-12 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 ring-4 ring-red-600/20 transition-transform active:scale-95 disabled:opacity-70"
      aria-label="Emergência SOS"
    >
      {busy ? <Loader2 className="size-5 animate-spin" /> : <AlertTriangle className="size-5" />}
      <span className="absolute -bottom-1 text-[9px] font-extrabold">SOS</span>
    </button>
  );
}

/* ===========================================================
 * Status bar superior
 * =========================================================== */
function StatusBar({
  isOnline,
  rating,
  onToggleOnline,
  toggling,
}: {
  isOnline: boolean;
  rating: number;
  onToggleOnline: () => void;
  toggling: boolean;
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      <button
        onClick={onToggleOnline}
        disabled={toggling}
        className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold shadow-lg backdrop-blur transition-colors ${
          isOnline ? "bg-emerald-500 text-white" : "bg-zinc-900/90 text-zinc-300"
        } disabled:opacity-70`}
      >
        {toggling ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
        {isOnline ? "Online" : "Você está offline"}
      </button>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[11px] font-bold text-zinc-900 shadow-lg backdrop-blur">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          {rating.toFixed(2)}
        </div>
        <DriverMenu />
      </div>
    </header>
  );
}

/* ===========================================================
 * Bottom Sheet: estados sem corrida (offline / online)
 * =========================================================== */
function IdleSheet({
  state,
  stats,
}: {
  state: DriverState;
  stats: ReturnType<typeof useDriverStats>["data"];
}) {
  const [open, setOpen] = useState(true);
  const today = Number(stats?.earnings_today ?? 0);
  const goal = 250;
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

      {state === "offline" ? (
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Você está offline</p>
          <h2 className="mt-1 text-xl font-extrabold">Toque em Online para receber corridas</h2>
        </div>
      ) : (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Aguardando corridas
          </div>
          <h2 className="mt-2 text-lg font-extrabold">Pronto para dirigir</h2>
          <p className="text-xs text-muted-foreground">Avisamos com som quando chegar uma corrida</p>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ganhos de hoje</p>
            <p className="text-2xl font-extrabold leading-none">{BRL.format(today)}</p>
          </div>
          {open ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
        </button>
        {open && (
          <div className="space-y-3 border-t border-border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Mini label="Semana" value={BRL.format(Number(stats?.earnings_week ?? 0))} />
              <Mini label="Corridas hoje" value={String(stats?.rides_today ?? 0)} />
              <Mini label="Corridas/semana" value={String(stats?.rides_week ?? 0)} />
              <Mini label="Meta" value={BRL.format(goal)} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Target className="size-3" /> Meta diária
                </span>
                <span>{Math.min(100, Math.round((today / goal) * 100))}%</span>
              </div>
              <Progress value={Math.min(100, (today / goal) * 100)} className="h-2" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Performance</p>
        <div className="grid grid-cols-2 gap-2">
          <PerfCard icon={<Star className="size-4 fill-amber-400 text-amber-400" />} label="Nota" value={Number(stats?.rating ?? 5).toFixed(2)} />
          <PerfCard icon={<TrendingUp className="size-4 text-emerald-500" />} label="Viagens" value={String(stats?.total_trips ?? 0)} />
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-extrabold">{value}</p>
    </div>
  );
}

function PerfCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

/* ===========================================================
 * Card de nova solicitação (sobreposto, com som)
 * =========================================================== */
function IncomingRideSheet({
  ride,
  onAccept,
  onDecline,
  accepting,
}: {
  ride: IncomingRide;
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
}) {
  const [secs, setSecs] = useState(20);
  useEffect(() => {
    playBeep();
    setSecs(20);
    const i = setInterval(() => setSecs((s) => (s <= 1 ? (onDecline(), 0) : s - 1)), 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride.id]);

  const p = ride.passenger;
  const initials = (p?.full_name ?? "U R")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/55 backdrop-blur-sm animate-in fade-in">
      <div className="w-full rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl animate-in slide-in-from-bottom-8">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
            Nova solicitação
          </span>
          <span className="text-xs font-bold text-muted-foreground">{secs}s</span>
        </div>

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
            <p className="text-2xl font-extrabold leading-none">{BRL.format(Number(ride.estimated_fare ?? 0))}</p>
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <CreditCard className="size-3" /> {ride.payment_method ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-3 text-center">
          <Metric label="Distância" value={ride.distance_km ? `${ride.distance_km.toFixed(1)} km` : "—"} />
          <Metric label="Duração" value={ride.duration_min ? `${Math.round(ride.duration_min)} min` : "—"} />
          <Metric label="Categoria" value={(ride.vehicle_category ?? "X").toUpperCase()} />
        </div>

        <div className="mt-4 space-y-2">
          <AddrRow color="emerald" label="Embarque" text={ride.origin_address} />
          <div className="ml-2 h-3 w-px border-l border-dashed border-border" />
          <AddrRow color="amber" label="Destino" text={ride.destination_address} />
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            className="h-14 flex-1 bg-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200"
            onClick={onDecline}
            disabled={accepting}
          >
            <X className="size-4" /> Recusar
          </Button>
          <Button
            className="h-14 flex-[2] bg-amber-400 text-base font-extrabold text-zinc-900 hover:bg-amber-500"
            onClick={onAccept}
            disabled={accepting}
          >
            {accepting ? <Loader2 className="size-5 animate-spin" /> : <Navigation2 className="size-5" />}
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

function AddrRow({ color, label, text }: { color: "emerald" | "amber"; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1">
        <MapPin className={`size-4 ${color === "emerald" ? "text-emerald-500" : "text-amber-500"}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{text}</p>
      </div>
    </div>
  );
}

/* ===========================================================
 * Painel da corrida em andamento (real backend)
 * =========================================================== */
function ActiveRideSheet({
  ride,
  state,
  onNext,
  onCancel,
  busy,
  showCompleted,
  onCloseCompleted,
}: {
  ride: CurrentRide | null;
  state: DriverState;
  onNext: () => void;
  onCancel: () => void;
  busy: boolean;
  showCompleted: boolean;
  onCloseCompleted: () => void;
}) {
  const cfg = useMemo(() => {
    if (state === "accepted")
      return {
        chip: "A caminho do passageiro",
        chipClass: "bg-amber-100 text-amber-800",
        title: ride
          ? `${(ride.distance_km ?? 0).toFixed(1)} km · ${Math.round(ride.duration_min ?? 0)} min`
          : "",
        addr: ride?.origin_address ?? "",
        addrLabel: "Embarque",
        navLat: ride?.origin_lat,
        navLng: ride?.origin_lng,
        cta: "Cheguei ao local",
      };
    if (state === "arrived")
      return {
        chip: "Aguardando passageiro",
        chipClass: "bg-blue-100 text-blue-800",
        title: "Aguardando embarque",
        addr: ride?.origin_address ?? "",
        addrLabel: "Embarque",
        navLat: ride?.origin_lat,
        navLng: ride?.origin_lng,
        cta: "Iniciar viagem",
      };
    if (state === "in_progress")
      return {
        chip: "Corrida em andamento",
        chipClass: "bg-emerald-100 text-emerald-800",
        title: ride
          ? `${(ride.distance_km ?? 0).toFixed(1)} km · ${Math.round(ride.duration_min ?? 0)} min`
          : "Em viagem",
        addr: ride?.destination_address ?? "",
        addrLabel: "Destino",
        navLat: ride?.destination_lat,
        navLng: ride?.destination_lng,
        cta: "Finalizar corrida",
      };
    return {
      chip: "Corrida finalizada",
      chipClass: "bg-emerald-500 text-white",
      title: ride
        ? `Você ganhou ${BRL.format(Number(ride.final_fare ?? ride.estimated_fare ?? 0))}`
        : "Finalizada",
      addr: ride?.destination_address ?? "",
      addrLabel: "Destino",
      navLat: null,
      navLng: null,
      cta: "Voltar a ficar online",
    };
  }, [state, ride]);

  const p = ride?.passenger;
  const isCompleted = state === "completed" || showCompleted;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${cfg.chipClass}`}>
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
        {cfg.chip}
      </div>
      <h2 className="mt-2 text-xl font-extrabold">{cfg.title}</h2>

      {!isCompleted && p && (
        <>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border p-3">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="size-12 rounded-full object-cover" />
            ) : (
              <div className="grid size-12 place-items-center rounded-full bg-secondary text-base font-extrabold text-primary">
                {(p.full_name ?? "U R").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{p.full_name ?? "Passageiro"}</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {Number(p.rating ?? 5).toFixed(2)} {p.phone ? `· ${p.phone}` : ""}
              </p>
            </div>
            <button
              onClick={() => toast("Chat em desenvolvimento")}
              className="grid size-10 place-items-center rounded-full bg-muted text-foreground"
              aria-label="Mensagem"
            >
              <MessageCircle className="size-4" />
            </button>
            {p.phone && (
              <a
                href={`tel:${p.phone.replace(/\D/g, "")}`}
                className="grid size-10 place-items-center rounded-full bg-emerald-500 text-white"
                aria-label="Ligar"
              >
                <Phone className="size-4" />
              </a>
            )}
          </div>

          <div className="mt-3 space-y-2 rounded-2xl bg-muted/40 p-3">
            <AddrRow color="emerald" label="Embarque" text={ride?.origin_address ?? ""} />
            <div className="ml-2 h-3 w-px border-l border-dashed border-border" />
            <AddrRow color="amber" label="Destino" text={ride?.destination_address ?? ""} />
          </div>

          <button
            onClick={() => openNavigation(cfg.navLat, cfg.navLng)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-bold"
          >
            <Navigation2 className="size-4" /> Abrir navegação GPS
          </button>
        </>
      )}

      {isCompleted && ride && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-3 text-center">
          <Metric label="Distância" value={`${(ride.distance_km ?? 0).toFixed(1)} km`} />
          <Metric label="Duração" value={`${Math.round(ride.duration_min ?? 0)} min`} />
          <Metric label="Pagamento" value={(ride.payment_method ?? "—").toString()} />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {!isCompleted && state !== "in_progress" && (
          <Button variant="outline" className="h-14 flex-1 text-sm font-bold" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
        <Button
          className="h-14 flex-[2] bg-amber-400 text-base font-extrabold text-zinc-900 hover:bg-amber-500"
          onClick={isCompleted ? onCloseCompleted : onNext}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : cfg.cta}
        </Button>
      </div>
    </div>
  );
}

/* ===========================================================
 * Hook: estatísticas
 * =========================================================== */
function useDriverStats() {
  const fn = useServerFn(getDriverStats);
  return useQuery({
    queryKey: ["driver-stats"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });
}

/* ===========================================================
 * Componente principal
 * =========================================================== */
export function DriverPremiumScreen() {
  const qc = useQueryClient();
  const currentRideFn = useServerFn(getDriverCurrentRide);
  const incomingListFn = useServerFn(listAvailableRidesForDriver);
  const acceptFn = useServerFn(acceptRide);
  const updateStatusFn = useServerFn(updateRideStatus);
  const locationFn = useServerFn(updateDriverLocation);

  const stats = useDriverStats();

  // ---- corrida ativa (accepted/driver_arrived/in_progress) ----
  const currentRideQ = useQuery({
    queryKey: ["driver-current-ride"],
    queryFn: () => currentRideFn(),
    refetchInterval: 30_000,
  });

  // ---- estados locais ----
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [incoming, setIncoming] = useState<IncomingRide | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [lastCompletedRide, setLastCompletedRide] = useState<CurrentRide | null>(null);
  const declined = useRef<Set<string>>(new Set());

  const currentRide = currentRideQ.data as CurrentRide | null;

  // Estado derivado da corrida ativa
  const derivedState: DriverState = useMemo(() => {
    if (showCompleted) return "completed";
    const s = rideStatusToDriverState(currentRide?.status);
    if (s) return s;
    if (incoming) return "incoming";
    return isOnline ? "online" : "offline";
  }, [currentRide, incoming, isOnline, showCompleted]);

  /* ===== Online toggle: atualiza posição/status no backend ===== */
  const toggleOnline = useCallback(async () => {
    if (togglingOnline) return;
    setTogglingOnline(true);
    const target = !isOnline;
    const send = async (lat: number, lng: number) => {
      try {
        await locationFn({ data: { lat, lng, is_online: target } });
        setIsOnline(target);
        toast.success(target ? "Você está online" : "Você está offline");
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao atualizar status");
      } finally {
        setTogglingOnline(false);
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => send(p.coords.latitude, p.coords.longitude),
        () => send(0, 0),
        { enableHighAccuracy: true, timeout: 6000 },
      );
    } else {
      send(0, 0);
    }
  }, [isOnline, togglingOnline, locationFn]);

  /* ===== Pulso de localização a cada 30s quando online ===== */
  useEffect(() => {
    if (!isOnline) return;
    const tick = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (p) => locationFn({ data: { lat: p.coords.latitude, lng: p.coords.longitude, is_online: true } }).catch(() => {}),
        () => {},
        { enableHighAccuracy: true, timeout: 6000 },
      );
    };
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, [isOnline, locationFn]);

  /* ===== Carga inicial e Realtime das solicitações ===== */
  useEffect(() => {
    if (!isOnline || currentRide) {
      setIncoming(null);
      return;
    }
    let active = true;
    const fetchList = async () => {
      try {
        const list = (await incomingListFn()) as IncomingRide[];
        if (!active) return;
        const next = list.find((r) => !declined.current.has(r.id));
        setIncoming((prev) => {
          if (next && (!prev || prev.id !== next.id)) {
            playBeep();
            return next;
          }
          return prev && list.some((r) => r.id === prev.id) ? prev : next ?? null;
        });
      } catch {
        /* ignore */
      }
    };
    fetchList();

    const ch = supabase
      .channel("driver-incoming-rides")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides", filter: "status=eq.requested" },
        () => fetchList(),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rides" }, (payload) => {
        const r = payload.new as any;
        if (r.status !== "requested" || r.driver_id) {
          setIncoming((prev) => (prev && prev.id === r.id ? null : prev));
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [isOnline, currentRide, incomingListFn]);

  /* ===== Realtime na corrida ativa ===== */
  useEffect(() => {
    if (!currentRide?.id) return;
    const ch = supabase
      .channel(`driver-ride-${currentRide.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${currentRide.id}` },
        () => qc.invalidateQueries({ queryKey: ["driver-current-ride"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [currentRide?.id, qc]);

  /* ===== Ações ===== */
  async function handleAccept() {
    if (!incoming || accepting) return;
    setAccepting(true);
    try {
      await acceptFn({ data: { ride_id: incoming.id } });
      toast.success("Corrida aceita");
      setIncoming(null);
      await qc.invalidateQueries({ queryKey: ["driver-current-ride"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao aceitar corrida");
    } finally {
      setAccepting(false);
    }
  }

  function handleDecline() {
    if (!incoming) return;
    declined.current.add(incoming.id);
    setIncoming(null);
    toast("Corrida recusada");
  }

  async function handleNext() {
    if (!currentRide || busy) return;
    setBusy(true);
    try {
      if (currentRide.status === "accepted") {
        await updateStatusFn({ data: { ride_id: currentRide.id, status: "driver_arrived" } });
      } else if (currentRide.status === "driver_arrived") {
        await updateStatusFn({ data: { ride_id: currentRide.id, status: "in_progress" } });
      } else if (currentRide.status === "in_progress") {
        const final = Number(currentRide.estimated_fare ?? 0);
        await updateStatusFn({
          data: { ride_id: currentRide.id, status: "completed", final_fare: final },
        });
        setLastCompletedRide({ ...currentRide, final_fare: final, status: "completed" });
        setShowCompleted(true);
        await qc.invalidateQueries({ queryKey: ["driver-stats"] });
      }
      await qc.invalidateQueries({ queryKey: ["driver-current-ride"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar corrida");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!currentRide || busy) return;
    if (!confirm("Cancelar esta corrida?")) return;
    setBusy(true);
    try {
      await updateStatusFn({
        data: { ride_id: currentRide.id, status: "cancelled", cancel_reason: "driver_cancelled" },
      });
      toast("Corrida cancelada");
      await qc.invalidateQueries({ queryKey: ["driver-current-ride"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cancelar");
    } finally {
      setBusy(false);
    }
  }

  function closeCompleted() {
    setShowCompleted(false);
    setLastCompletedRide(null);
    qc.invalidateQueries({ queryKey: ["driver-current-ride"] });
  }

  const showIdle = derivedState === "offline" || derivedState === "online";
  const showActive =
    derivedState === "accepted" ||
    derivedState === "arrived" ||
    derivedState === "in_progress" ||
    derivedState === "completed";
  const mapActive = showActive;

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-zinc-950">
      <FakeMap active={mapActive} />
      <StatusBar
        isOnline={isOnline}
        rating={Number(stats.data?.rating ?? 5)}
        onToggleOnline={toggleOnline}
        toggling={togglingOnline}
      />
      <SOSButton rideId={currentRide?.id} />

      {showIdle && <IdleSheet state={derivedState} stats={stats.data} />}
      {showActive && (
        <ActiveRideSheet
          ride={showCompleted ? lastCompletedRide : currentRide}
          state={derivedState}
          onNext={handleNext}
          onCancel={handleCancel}
          busy={busy}
          showCompleted={showCompleted}
          onCloseCompleted={closeCompleted}
        />
      )}
      {derivedState === "incoming" && incoming && (
        <IncomingRideSheet
          ride={incoming}
          onAccept={handleAccept}
          onDecline={handleDecline}
          accepting={accepting}
        />
      )}
    </div>
  );
}
