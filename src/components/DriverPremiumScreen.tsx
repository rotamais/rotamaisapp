import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CreditCard,
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
import { toast } from "sonner";

/* ===========================================================
 * Tela premium do motorista — Uber/99 style
 * Todos os estados num único componente, com mock data.
 * =========================================================== */

type DriverState =
  | "offline"
  | "online"
  | "incoming"
  | "accepted"
  | "arrived"
  | "in_progress"
  | "completed";

const MOCK_PASSENGER = {
  name: "Marina Lopes",
  photo:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  rating: 4.92,
  phone: "+55 11 98765-4321",
  trips: 134,
};

const MOCK_RIDE = {
  pickup: "Av. Paulista, 1578 — Bela Vista",
  dropoff: "Aeroporto de Congonhas — Vila Congonhas",
  distanceToPickup: 1.4,
  totalDistance: 12.8,
  duration: 28,
  fare: 47.9,
  payment: "Cartão · Visa **2210",
};

const MOCK_PERF = {
  rating: 4.96,
  acceptance: 94,
  cancellation: 2,
  totalTrips: 1842,
};

const MOCK_FIN = {
  today: 184.5,
  week: 1247.8,
  rides: 12,
  online: "6h 12m",
  goal: 250,
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATES: { id: DriverState; label: string }[] = [
  { id: "offline", label: "Offline" },
  { id: "online", label: "Online" },
  { id: "incoming", label: "Solicitação" },
  { id: "accepted", label: "Aceita" },
  { id: "arrived", label: "No local" },
  { id: "in_progress", label: "Em viagem" },
  { id: "completed", label: "Finalizada" },
];

/* ---------- helpers ---------- */
function playBeep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.2, 0.4].forEach((t) => {
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

/* ===========================================================
 * Mapa SVG estilizado (sem dependência externa)
 * =========================================================== */
function FakeMap({ state }: { state: DriverState }) {
  const showRoute = state !== "offline" && state !== "online";
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1d1f24]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0v40" fill="none" stroke="#262a31" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="600" fill="url(#grid)" />
        {/* ruas */}
        <path d="M-20 180 L420 220" stroke="#3a3f48" strokeWidth="22" />
        <path d="M-20 380 L420 360" stroke="#3a3f48" strokeWidth="18" />
        <path d="M120 -20 L160 620" stroke="#3a3f48" strokeWidth="20" />
        <path d="M280 -20 L260 620" stroke="#3a3f48" strokeWidth="16" />
        <path d="M-20 180 L420 220" stroke="#4a4f58" strokeWidth="1" strokeDasharray="6 8" />
        <path d="M-20 380 L420 360" stroke="#4a4f58" strokeWidth="1" strokeDasharray="6 8" />
        {/* rota */}
        {showRoute && (
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
        {/* carro do motorista */}
        <g transform={`translate(${showRoute ? 140 : 200}, ${showRoute ? 420 : 300})`}>
          <circle r="22" fill="#FFC107" opacity="0.18">
            <animate attributeName="r" values="18;30;18" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0;0.25" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle r="10" fill="#FFC107" stroke="#121212" strokeWidth="2" />
        </g>
      </svg>
      {/* vinheta */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
    </div>
  );
}

/* ===========================================================
 * Botão SOS flutuante
 * =========================================================== */
function SOSButton() {
  return (
    <button
      onClick={() => {
        toast.error("Central acionada · localização compartilhada", {
          description: "Suporte de emergência a caminho.",
        });
      }}
      className="fixed right-4 top-[calc(env(safe-area-inset-top)+72px)] z-40 grid size-12 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 ring-4 ring-red-600/20 transition-transform active:scale-95"
      aria-label="Emergência SOS"
    >
      <AlertTriangle className="size-5" />
      <span className="absolute -bottom-1 text-[9px] font-extrabold">SOS</span>
    </button>
  );
}

/* ===========================================================
 * Status bar superior
 * =========================================================== */
function StatusBar({
  state,
  onToggleOnline,
}: {
  state: DriverState;
  onToggleOnline: () => void;
}) {
  const isOffline = state === "offline";
  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      <button
        onClick={onToggleOnline}
        className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold shadow-lg backdrop-blur transition-colors ${
          isOffline
            ? "bg-zinc-900/90 text-zinc-300"
            : "bg-emerald-500 text-white"
        }`}
      >
        <Power className="size-3.5" />
        {isOffline ? "Você está offline" : "Online"}
      </button>
      <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[11px] font-bold text-zinc-900 shadow-lg backdrop-blur">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        {MOCK_PERF.rating.toFixed(2)}
      </div>
    </header>
  );
}

/* ===========================================================
 * Bottom Sheet: estados sem corrida (offline / online)
 * =========================================================== */
function IdleSheet({ state }: { state: DriverState }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

      {state === "offline" ? (
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Você está offline
          </p>
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

      {/* Dashboard financeiro recolhível */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Ganhos de hoje
            </p>
            <p className="text-2xl font-extrabold leading-none">{BRL.format(MOCK_FIN.today)}</p>
          </div>
          {open ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
        </button>
        {open && (
          <div className="space-y-3 border-t border-border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Mini label="Semana" value={BRL.format(MOCK_FIN.week)} />
              <Mini label="Corridas" value={String(MOCK_FIN.rides)} />
              <Mini label="Online" value={MOCK_FIN.online} />
              <Mini label="Meta" value={BRL.format(MOCK_FIN.goal)} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Target className="size-3" /> Meta diária
                </span>
                <span>{Math.round((MOCK_FIN.today / MOCK_FIN.goal) * 100)}%</span>
              </div>
              <Progress value={(MOCK_FIN.today / MOCK_FIN.goal) * 100} className="h-2" />
            </div>
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Performance
        </p>
        <div className="grid grid-cols-2 gap-2">
          <PerfCard icon={<Star className="size-4 fill-amber-400 text-amber-400" />} label="Nota" value={MOCK_PERF.rating.toFixed(2)} />
          <PerfCard icon={<TrendingUp className="size-4 text-emerald-500" />} label="Aceitação" value={`${MOCK_PERF.acceptance}%`} />
          <PerfCard icon={<X className="size-4 text-red-500" />} label="Cancelamento" value={`${MOCK_PERF.cancellation}%`} />
          <PerfCard icon={<Navigation2 className="size-4 text-primary" />} label="Viagens" value={String(MOCK_PERF.totalTrips)} />
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
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [secs, setSecs] = useState(15);
  useEffect(() => {
    playBeep();
    const i = setInterval(() => setSecs((s) => (s <= 1 ? (onDecline(), 0) : s - 1)), 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <img src={MOCK_PASSENGER.photo} alt="" className="size-14 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{MOCK_PASSENGER.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-foreground">{MOCK_PASSENGER.rating.toFixed(2)}</span>
              <span>· {MOCK_PASSENGER.trips} corridas</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold leading-none">{BRL.format(MOCK_RIDE.fare)}</p>
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <CreditCard className="size-3" /> {MOCK_RIDE.payment.split(" ")[0]}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-3 text-center">
          <Metric label="Até embarque" value={`${MOCK_RIDE.distanceToPickup} km`} />
          <Metric label="Viagem" value={`${MOCK_RIDE.totalDistance} km`} />
          <Metric label="Duração" value={`${MOCK_RIDE.duration} min`} />
        </div>

        <div className="mt-4 space-y-2">
          <AddrRow color="emerald" label="Embarque" text={MOCK_RIDE.pickup} />
          <div className="ml-2 h-3 w-px border-l border-dashed border-border" />
          <AddrRow color="amber" label="Destino" text={MOCK_RIDE.dropoff} />
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            className="h-14 flex-1 bg-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200"
            onClick={onDecline}
          >
            <X className="size-4" /> Recusar
          </Button>
          <Button
            className="h-14 flex-[2] bg-amber-400 text-base font-extrabold text-zinc-900 hover:bg-amber-500"
            onClick={onAccept}
          >
            <Navigation2 className="size-5" /> Aceitar corrida
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
        <MapPin className={`size-4 ${color === "emerald" ? "text-emerald-500" : "text-amber-500"}`} />
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
 * Painel da corrida em andamento (accepted → arrived → in_progress → completed)
 * =========================================================== */
function ActiveRideSheet({
  state,
  onNext,
  onCancel,
}: {
  state: DriverState;
  onNext: () => void;
  onCancel: () => void;
}) {
  const cfg = useMemo(() => {
    if (state === "accepted")
      return {
        chip: "A caminho do passageiro",
        chipClass: "bg-amber-100 text-amber-800",
        title: `${MOCK_RIDE.distanceToPickup} km · ${Math.round(MOCK_RIDE.duration / 3)} min`,
        address: MOCK_RIDE.pickup,
        addrLabel: "Embarque",
        cta: "Cheguei ao local",
      };
    if (state === "arrived")
      return {
        chip: "Aguardando passageiro",
        chipClass: "bg-blue-100 text-blue-800",
        title: "Aguardando embarque",
        address: MOCK_RIDE.pickup,
        addrLabel: "Embarque",
        cta: "Iniciar viagem",
      };
    if (state === "in_progress")
      return {
        chip: "Corrida em andamento",
        chipClass: "bg-emerald-100 text-emerald-800",
        title: `${MOCK_RIDE.totalDistance} km · ${MOCK_RIDE.duration} min restantes`,
        address: MOCK_RIDE.dropoff,
        addrLabel: "Destino",
        cta: "Finalizar corrida",
      };
    return {
      chip: "Corrida finalizada",
      chipClass: "bg-emerald-500 text-white",
      title: `Você ganhou ${BRL.format(MOCK_RIDE.fare)}`,
      address: MOCK_RIDE.dropoff,
      addrLabel: "Destino",
      cta: "Voltar a ficar online",
    };
  }, [state]);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${cfg.chipClass}`}>
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
        {cfg.chip}
      </div>
      <h2 className="mt-2 text-xl font-extrabold">{cfg.title}</h2>

      {state !== "completed" && (
        <>
          {/* passageiro + ações de contato */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border p-3">
            <img src={MOCK_PASSENGER.photo} alt="" className="size-12 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{MOCK_PASSENGER.name}</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {MOCK_PASSENGER.rating.toFixed(2)} · {MOCK_PASSENGER.phone}
              </p>
            </div>
            <button
              onClick={() => toast.success("Chat rápido aberto")}
              className="grid size-10 place-items-center rounded-full bg-muted text-foreground"
              aria-label="Mensagem"
            >
              <MessageCircle className="size-4" />
            </button>
            <a
              href={`tel:${MOCK_PASSENGER.phone.replace(/\D/g, "")}`}
              className="grid size-10 place-items-center rounded-full bg-emerald-500 text-white"
              aria-label="Ligar"
            >
              <Phone className="size-4" />
            </a>
          </div>

          <div className="mt-3 space-y-2 rounded-2xl bg-muted/40 p-3">
            <AddrRow color="emerald" label="Embarque" text={MOCK_RIDE.pickup} />
            <div className="ml-2 h-3 w-px border-l border-dashed border-border" />
            <AddrRow color="amber" label="Destino" text={MOCK_RIDE.dropoff} />
          </div>

          <button
            onClick={() => toast("Navegação GPS iniciada")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-bold"
          >
            <Navigation2 className="size-4" /> Abrir navegação GPS
          </button>
        </>
      )}

      {state === "completed" && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-3 text-center">
          <Metric label="Distância" value={`${MOCK_RIDE.totalDistance} km`} />
          <Metric label="Duração" value={`${MOCK_RIDE.duration} min`} />
          <Metric label="Pagamento" value="Cartão" />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {state !== "completed" && state !== "in_progress" && (
          <Button variant="outline" className="h-14 flex-1 text-sm font-bold" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          className="h-14 flex-[2] bg-amber-400 text-base font-extrabold text-zinc-900 hover:bg-amber-500"
          onClick={onNext}
        >
          {cfg.cta}
        </Button>
      </div>
    </div>
  );
}

/* ===========================================================
 * Seletor de estado (apenas para demo do MVP)
 * =========================================================== */
function StateSwitcher({
  state,
  setState,
}: {
  state: DriverState;
  setState: (s: DriverState) => void;
}) {
  return (
    <div className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900/85 p-1 text-[10px] font-bold text-white shadow-xl backdrop-blur">
      <div className="flex gap-0.5">
        {STATES.map((s) => (
          <button
            key={s.id}
            onClick={() => setState(s.id)}
            className={`rounded-full px-2.5 py-1.5 transition-colors ${
              state === s.id ? "bg-amber-400 text-zinc-900" : "text-zinc-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===========================================================
 * Componente principal
 * =========================================================== */
export function DriverPremiumScreen() {
  const [state, setState] = useState<DriverState>("online");
  const lastIncoming = useRef<number>(0);

  // Simula chegada de nova solicitação a cada 25s no estado "online"
  useEffect(() => {
    if (state !== "online") return;
    const t = setTimeout(() => {
      if (Date.now() - lastIncoming.current > 5000) {
        lastIncoming.current = Date.now();
        setState("incoming");
      }
    }, 25_000);
    return () => clearTimeout(t);
  }, [state]);

  function next() {
    setState((s) => {
      if (s === "accepted") return "arrived";
      if (s === "arrived") return "in_progress";
      if (s === "in_progress") return "completed";
      if (s === "completed") return "online";
      return s;
    });
  }

  const showIdle = state === "offline" || state === "online";
  const showActive =
    state === "accepted" || state === "arrived" || state === "in_progress" || state === "completed";

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-zinc-950">
      <FakeMap state={state} />
      <StatusBar
        state={state}
        onToggleOnline={() => setState((s) => (s === "offline" ? "online" : "offline"))}
      />
      <SOSButton />

      {showIdle && <IdleSheet state={state} />}
      {showActive && (
        <ActiveRideSheet
          state={state}
          onNext={() => {
            if (state === "completed") {
              toast.success("Pronto para a próxima corrida!");
            }
            next();
          }}
          onCancel={() => {
            toast("Corrida cancelada");
            setState("online");
          }}
        />
      )}
      {state === "incoming" && (
        <IncomingRideSheet
          onAccept={() => {
            toast.success("Corrida aceita");
            setState("accepted");
          }}
          onDecline={() => {
            toast("Corrida recusada");
            setState("online");
          }}
        />
      )}

      <StateSwitcher state={state} setState={setState} />
    </div>
  );
}
