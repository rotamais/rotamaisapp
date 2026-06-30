import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
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
import { DriverDocumentsManager } from "@/components/DriverDocumentsManager";
import { RealMap, type LatLng } from "@/components/RealMap";
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

function formatKm(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)} km`;
}

function formatMin(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${Math.round(value)} min`;
}

function formatElapsed(from: Date | null) {
  if (!from) return "—";
  const diff = Math.max(0, Date.now() - from.getTime());
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours > 0) return `${hours}h ${rest}m`;
  return `${rest}m`;
}

function calculateDistanceKm(a: LatLng, b: LatLng) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

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
function FakeMap({
  active,
  currentPosition,
  mapCenter,
}: {
  active: boolean;
  currentPosition?: LatLng | null;
  mapCenter?: LatLng | null;
}) {
  const hotspots = [
    { x: 70, y: 120, r: 42 },
    { x: 320, y: 180, r: 38 },
    { x: 240, y: 420, r: 48 },
  ];
  const center = mapCenter ? { x: 200, y: 300 } : { x: 200, y: 300 };
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1d1f24]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 600"
        preserveAspectRatio="xMidYMid slice"
      >
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
        {hotspots.map((spot, index) => (
          <g key={index}>
            <circle cx={spot.x} cy={spot.y} r={spot.r} fill="#FFC107" opacity="0.15" />
            <circle cx={spot.x} cy={spot.y} r={spot.r * 0.55} fill="#FFC107" opacity="0.08" />
          </g>
        ))}
        {currentPosition && (
          <g>
            <circle cx={center.x} cy={center.y} r="24" fill="#22c55e" opacity="0.18" />
            <circle cx={center.x} cy={center.y} r="12" fill="#22c55e" />
            <circle cx={center.x} cy={center.y} r="5" fill="#fff" />
          </g>
        )}
        {active && (
          <>
            <path
              d="M140 420 C 200 360, 220 300, 270 220"
              stroke="#FFC107"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="140" cy="420" r="9" fill="#22c55e" stroke="#fff" strokeWidth="3" />
            <circle cx="270" cy="220" r="9" fill="#FFC107" stroke="#121212" strokeWidth="3" />
          </>
        )}
        <g transform={`translate(${center.x}, ${center.y})`}>
          <circle r="22" fill="#FFC107" opacity="0.18">
            <animate attributeName="r" values="18;30;18" dur="2.4s" repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0.25;0;0.25"
              dur="2.4s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="10" fill="#FFC107" stroke="#121212" strokeWidth="2" />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
      <div className="absolute left-4 top-4 rounded-3xl bg-black/70 px-3 py-2 text-[11px] font-semibold text-white shadow-lg backdrop-blur">
        Áreas de alta demanda
      </div>
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
function HeaderBar({
  profile,
  isOnline,
  rating,
  onToggleOnline,
  toggling,
  canGoOnline,
}: {
  profile?: { avatar_url?: string | null; full_name?: string | null } | null;
  isOnline: boolean;
  rating: number;
  onToggleOnline: () => void;
  toggling: boolean;
  canGoOnline: boolean;
}) {
  const initials = (profile?.full_name ?? "Motorista")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="flex items-center justify-between gap-3 rounded-3xl bg-black/85 px-4 py-3 shadow-2xl ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? "Motorista"}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-sm font-bold text-secondary shadow-sm">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{profile?.full_name ?? "Motorista"}</p>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-300">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleOnline}
            disabled={toggling || !canGoOnline}
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold transition-colors ${
              isOnline ? "bg-emerald-500 text-white" : "bg-zinc-900/90 text-zinc-300"
            } ${!canGoOnline ? "cursor-not-allowed opacity-70" : ""} disabled:opacity-70`}
          >
            {toggling ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
            {canGoOnline ? (isOnline ? "Online" : "Offline") : "Pendente"}
          </button>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full bg-zinc-900/90 text-white shadow-lg"
            aria-label="Notificações"
            onClick={() => {
              /* placeholder */
            }}
          >
            <Bell className="size-5" />
          </button>
          <DriverMenu />
        </div>
      </div>
    </header>
  );
}

/* ===========================================================
 * Bottom Sheet: estados sem corrida (offline / online)
 * =========================================================== */
function DriverControlPanel({
  onlineSince,
  autoAccept,
  onToggleAutoAccept,
  canGoOnline,
}: {
  onlineSince: Date | null;
  autoAccept: boolean;
  onToggleAutoAccept: () => void;
  canGoOnline: boolean;
}) {
  return (
    <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+100px)] z-40 w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-black/70 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-md text-white sm:w-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">Tempo online</p>
          <p className="mt-1 text-base font-bold">{formatElapsed(onlineSince)}</p>
        </div>
        <div className="rounded-2xl bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-950">Hot Zones</div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-full bg-white/10 px-3 py-1">3 zonas ativas</span>
        <span className="rounded-full bg-white/10 px-3 py-1">Rota curta</span>
        <button
          onClick={onToggleAutoAccept}
          disabled={!canGoOnline}
          className={`rounded-full px-3 py-1 font-semibold transition ${
            autoAccept ? "bg-emerald-500 text-black" : "bg-white/10 text-white"
          } ${!canGoOnline ? "cursor-not-allowed opacity-60" : ""}`}
        >
          Auto Aceitar {autoAccept ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}

function IdleSheet({
  state,
  stats,
  canGoOnline,
  userId,
  documents,
  vehicleId,
}: {
  state: DriverState;
  stats: ReturnType<typeof useDriverStats>["data"];
  canGoOnline: boolean;
  userId?: string;
  documents?: Array<{ id: string; type: string; storage_path: string; verified: boolean }>;
  vehicleId?: string;
}) {
  const [open, setOpen] = useState(true);
  const today = Number(stats?.earnings_today ?? 0);
  const goal = 250;
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

      {state === "offline" ? (
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {canGoOnline ? "Você está offline" : "Cadastro em análise"}
          </p>
          <h2 className="mt-1 text-xl font-extrabold">
            {canGoOnline ? "Toque em Online para receber corridas" : "Você já pode enviar os documentos do motorista"}
          </h2>
        </div>
      ) : (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {canGoOnline ? "Aguardando corridas" : "Aguardando análise"}
          </div>
          <h2 className="mt-2 text-lg font-extrabold">
            {canGoOnline ? "Pronto para dirigir" : "Seu cadastro ainda está em revisão"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {canGoOnline
              ? "Avisamos com som quando chegar uma corrida"
              : "Envie os documentos necessários para concluir o cadastro de motorista."}
          </p>
        </div>
      )}

      {!canGoOnline && (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Acesso parcial liberado
          </p>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
            Você pode já subir os documentos exigidos para se tornar motorista de aplicativo.
            O painel para ficar online será liberado após a aprovação.
          </p>
        </div>
      )}

      {!canGoOnline && userId && (
        <div className="mt-4">
          <DriverDocumentsManager
            userId={userId}
            documents={documents ?? []}
            vehicleId={vehicleId}
            onChanged={() => {}}
          />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Ganhos de hoje
            </p>
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
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Performance
        </p>
        <div className="grid grid-cols-2 gap-2">
          <PerfCard
            icon={<Star className="size-4 fill-amber-400 text-amber-400" />}
            label="Nota"
            value={Number(stats?.rating ?? 5).toFixed(2)}
          />
          <PerfCard
            icon={<TrendingUp className="size-4 text-emerald-500" />}
            label="Viagens"
            value={String(stats?.total_trips ?? 0)}
          />
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-base font-extrabold">{value}</p>
    </div>
  );
}

function PerfCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
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
  pickupDistance,
  onAccept,
  onDecline,
  accepting,
}: {
  ride: IncomingRide;
  pickupDistance?: number | null;
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
      <div className="w-full rounded-t-3xl bg-card/95 p-5 pb-[calc(env(safe-area-inset-bottom)+18px)] shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-8">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Nova solicitação</p>
            <p className="mt-1 text-sm text-muted-foreground">Aceite rápido para começar a corrida</p>
          </div>
          <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            {secs}s
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-3xl bg-zinc-950/85 p-4 shadow-lg ring-1 ring-white/10">
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-lg font-bold text-primary">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold">{p?.full_name ?? "Passageiro"}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                {Number(p?.rating ?? 5).toFixed(1)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                {p?.total_rides ?? 0} viagens
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold leading-none">{BRL.format(Number(ride.estimated_fare ?? 0))}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {ride.payment_method ?? "Pagamento"
              }
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric label="Distância até embarque" value={formatKm(pickupDistance)} />
          <Metric label="Distância total" value={formatKm(ride.distance_km)} />
          <Metric label="Tempo estimado" value={formatMin(ride.duration_min)} />
          <Metric label="Pagamento" value={ride.payment_method ?? "—"} />
        </div>

        <div className="mt-4 rounded-3xl bg-zinc-950/85 p-4 shadow-inner ring-1 ring-white/10">
          <AddrRow color="emerald" label="Embarque" text={ride.origin_address} />
          <div className="mx-auto my-3 h-0.5 w-10 rounded-full bg-border" />
          <AddrRow color="amber" label="Destino" text={ride.destination_address} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
          <Button
            variant="secondary"
            className="h-14 w-full rounded-3xl bg-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200"
            onClick={onDecline}
            disabled={accepting}
          >
            <X className="size-4" /> Recusar
          </Button>
          <Button
            className="h-14 w-full rounded-3xl bg-amber-400 text-base font-extrabold text-zinc-950 hover:bg-amber-500"
            onClick={onAccept}
            disabled={accepting}
          >
            {accepting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Navigation2 className="size-5" />
            )}
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
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-extrabold">{value}</p>
    </div>
  );
}

function AddrRow({
  color,
  label,
  text,
}: {
  color: "emerald" | "amber";
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1">
        <MapPin
          className={`size-4 ${color === "emerald" ? "text-emerald-500" : "text-amber-500"}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
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
          : "A caminho",
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
        title: "Preparado para embarque",
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
          ? `${(ride.distance_km ?? 0).toFixed(1)} km · ${Math.round(ride.duration_min ?? 0)} min restantes`
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
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-[32px] bg-card/95 p-5 pb-[calc(env(safe-area-inset-bottom)+18px)] shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${cfg.chipClass}`}
            >
              <span className="h-2.5 w-2.5 rounded-full animate-pulse bg-current" />
              {cfg.chip}
            </div>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">{cfg.title}</h2>
          </div>

          <div className="rounded-3xl bg-zinc-950/80 p-3 text-right shadow-sm ring-1 ring-border">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Tarifa estimada</p>
            <p className="mt-1 text-lg font-extrabold">{BRL.format(Number(ride?.estimated_fare ?? 0))}</p>
          </div>
        </div>

        {!isCompleted && p && (
          <div className="rounded-3xl border border-border bg-zinc-950/85 p-4 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-lg font-bold text-primary">
                    {(p.full_name ?? "U R")
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold">{p.full_name ?? "Passageiro"}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      {Number(p.rating ?? 5).toFixed(1)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                      {p.total_rides ?? 0} viagens
                    </span>
                  </p>
                  {p.phone && (
                    <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      {p.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  onClick={() => toast("Chat em desenvolvimento")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-muted px-4 text-sm font-bold transition hover:bg-white/5"
                >
                  <MessageCircle className="size-4" /> Chat
                </button>
                {p.phone && (
                  <a
                    href={`tel:${p.phone.replace(/\D/g, "")}`}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-bold text-black transition hover:bg-emerald-400"
                  >
                    <Phone className="size-4" /> Ligar
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 rounded-3xl bg-zinc-950/85 p-4 shadow-inner ring-1 ring-white/10">
          <div className="space-y-4">
            <AddrRow color="emerald" label="Embarque" text={ride?.origin_address ?? ""} />
            <div className="h-px bg-border" />
            <AddrRow color="amber" label="Destino" text={ride?.destination_address ?? ""} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Distância" value={`${(ride?.distance_km ?? 0).toFixed(1)} km`} />
            <Metric label="Tempo" value={`${Math.round(ride?.duration_min ?? 0)} min`} />
            <Metric label="Pagamento" value={ride?.payment_method ?? "—"} />
          </div>

          {!isCompleted && (
            <button
              onClick={() => openNavigation(cfg.navLat, cfg.navLng)}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-black/70 py-3 text-sm font-bold text-white transition hover:bg-black"
            >
              <Navigation2 className="size-4" /> Abrir navegação GPS
            </button>
          )}
        </div>

        {isCompleted && ride && (
          <div className="space-y-3 rounded-3xl bg-emerald-500/10 p-4 text-center text-black shadow-sm ring-1 ring-emerald-500/20">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-700">Resumo da corrida</p>
            <p className="text-2xl font-extrabold">{BRL.format(Number(ride.final_fare ?? ride.estimated_fare ?? 0))}</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Metric label="Distância" value={`${(ride.distance_km ?? 0).toFixed(1)} km`} />
              <Metric label="Duração" value={`${Math.round(ride.duration_min ?? 0)} min`} />
              <Metric label="Pagamento" value={ride?.payment_method ?? "—"} />
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.6fr]">
          {!isCompleted && state !== "in_progress" && (
            <Button
              variant="outline"
              className="h-14 w-full text-sm font-bold"
              onClick={onCancel}
              disabled={busy}
            >
              Cancelar
            </Button>
          )}
          <Button
            className="h-14 w-full rounded-3xl bg-amber-400 text-base font-extrabold text-zinc-900 hover:bg-amber-500"
            onClick={isCompleted ? onCloseCompleted : onNext}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : cfg.cta}
          </Button>
        </div>
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
export function DriverPremiumScreen({
  profile,
  canGoOnline = true,
  userId,
  driverDocuments = [],
  vehicleId,
}: {
  profile?: { avatar_url?: string | null; full_name?: string | null } | null;
  canGoOnline?: boolean;
  userId?: string;
  driverDocuments?: Array<{ id: string; type: string; storage_path: string; verified: boolean }>;
  vehicleId?: string;
}) {
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
  const [onlineSince, setOnlineSince] = useState<Date | null>(null);
  const [autoAccept, setAutoAccept] = useState(false);
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
    if (!canGoOnline) {
      toast.error("Seu cadastro ainda está em análise. Envie os documentos e aguarde a aprovação para ficar online.");
      return;
    }
    if (togglingOnline) return;
    setTogglingOnline(true);
    const target = !isOnline;
    const send = async (lat: number, lng: number) => {
      try {
        await locationFn({ data: { lat, lng, is_online: target } });
        setIsOnline(target);
        setOnlineSince(target ? new Date() : null);
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
  }, [canGoOnline, isOnline, togglingOnline, locationFn]);

  useEffect(() => {
    if (!incoming || !autoAccept || accepting) return;
    const timeout = window.setTimeout(() => {
      handleAccept();
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [incoming, autoAccept, accepting]);

  /* ===== Pulso de localização a cada 30s quando online ===== */
  useEffect(() => {
    if (!isOnline) return;
    const tick = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (p) =>
          locationFn({
            data: { lat: p.coords.latitude, lng: p.coords.longitude, is_online: true },
          }).catch(() => {}),
        () => {},
        { enableHighAccuracy: true, timeout: 6000 },
      );
    };
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, [isOnline, locationFn]);

  /* ===== Carga inicial e Realtime das solicitações ===== */
  useEffect(() => {
    if (!isOnline || !canGoOnline || currentRide) {
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
          return prev && list.some((r) => r.id === prev.id) ? prev : (next ?? null);
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rides" }, (payload: any) => {
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
  }, [isOnline, canGoOnline, currentRide, incomingListFn]);

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

  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentPosition(loc);
        setMapCenter((prev) => prev ?? loc);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 8000 },
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  const centerCurrentLocation = () => {
    if (currentPosition) setMapCenter(currentPosition);
  };

  const currentPickupDistance = incoming?.origin_lat && incoming?.origin_lng && currentPosition
    ? calculateDistanceKm(currentPosition, { lat: incoming.origin_lat, lng: incoming.origin_lng })
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      <div className="relative h-[70vh] min-h-[420px]">
        <RealMap
          className="h-full w-full"
          center={mapCenter ?? currentPosition ?? undefined}
          origin={currentPosition ?? undefined}
          destination={
            incoming?.origin_lat && incoming?.origin_lng
              ? { lat: incoming.origin_lat, lng: incoming.origin_lng }
              : currentRide?.status === "in_progress" && currentRide.destination_lat && currentRide.destination_lng
              ? { lat: currentRide.destination_lat, lng: currentRide.destination_lng }
              : currentRide?.origin_lat && currentRide?.origin_lng
              ? { lat: currentRide.origin_lat, lng: currentRide.origin_lng }
              : undefined
          }
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-6 top-24 hidden rounded-3xl bg-black/70 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-md md:block">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">Hotzone</p>
            <p className="mt-1 text-base font-bold">Área de alta demanda</p>
          </div>
          <span className="absolute left-12 top-36 block h-28 w-28 rounded-full bg-amber-400/15 blur-3xl" />
          <span className="absolute right-14 top-28 block h-24 w-24 rounded-full bg-amber-400/15 blur-3xl" />
          <span className="absolute left-28 bottom-24 block h-32 w-32 rounded-full bg-amber-400/12 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-black/70 text-white shadow-2xl">
              <MapPin className="size-8 text-amber-400" />
              <span className="absolute inset-0 rounded-full border border-amber-400/50" />
            </div>
          </div>
        </div>
        <HeaderBar
          profile={profile}
          isOnline={isOnline}
          rating={Number(stats.data?.rating ?? 5)}
          onToggleOnline={toggleOnline}
          toggling={togglingOnline}
          canGoOnline={canGoOnline}
        />
        <DriverControlPanel
          onlineSince={onlineSince}
          autoAccept={autoAccept}
          onToggleAutoAccept={() => setAutoAccept((active) => !active)}
          canGoOnline={canGoOnline}
        />
        <button
          type="button"
          onClick={centerCurrentLocation}
          className="absolute right-4 bottom-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-black/80 text-white shadow-lg ring-1 ring-white/10 transition hover:bg-black"
          aria-label="Centralizar localização"
        >
          <Navigation2 className="size-5" />
        </button>
        <SOSButton rideId={currentRide?.id} />
      </div>

      {showIdle && (
        <IdleSheet
          state={derivedState}
          stats={stats.data}
          canGoOnline={canGoOnline}
          userId={userId}
          documents={driverDocuments}
          vehicleId={vehicleId}
        />
      )}
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
          pickupDistance={currentPickupDistance}
          onAccept={handleAccept}
          onDecline={handleDecline}
          accepting={accepting}
        />
      )}
    </div>
  );
}
