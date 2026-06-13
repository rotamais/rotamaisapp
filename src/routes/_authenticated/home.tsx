import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapMock } from "@/components/MapMock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Home as HomeIcon, MapPin, Menu, Search, Star } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { requestRide } from "@/lib/rotamais.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: PassengerHome,
});

type Stage = "idle" | "destination" | "searching" | "matched";

function PassengerHome() {
  const [stage, setStage] = useState<Stage>("idle");
  const [origin, setOrigin] = useState("Minha localização");
  const [destination, setDestination] = useState("");
  const requestFn = useServerFn(requestRide);

  const estDistance = 6.2;
  const estFare = 28.9;
  const estDuration = 14;

  const handleRequest = async () => {
    if (!destination.trim()) {
      toast.error("Informe o destino");
      return;
    }
    setStage("searching");
    try {
      await requestFn({
        data: {
          origin_address: origin,
          origin_lat: -23.5505,
          origin_lng: -46.6333,
          destination_address: destination,
          destination_lat: -23.561,
          destination_lng: -46.656,
          distance_km: estDistance,
          duration_min: estDuration,
          estimated_fare: estFare,
          payment_method: "card",
        },
      });
      setTimeout(() => setStage("matched"), 2200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao solicitar");
      setStage("destination");
    }
  };

  return (
    <div className="relative">
      {/* Map */}
      <div className="relative h-[58vh] min-h-[420px] w-full">
        <MapMock className="h-full w-full" searching={stage === "searching"} pin={{ label: "Você" }} />
        <header className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
          <button className="grid size-10 place-items-center rounded-full bg-background shadow-[var(--shadow-soft)]">
            <Menu className="size-5" />
          </button>
          <span className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
            RotaMais
          </span>
          <div className="size-10" />
        </header>
      </div>

      {/* Sheet */}
      <div className="-mt-8 rounded-t-3xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

        {stage === "idle" && (
          <>
            <h2 className="text-xl font-extrabold">Para onde vamos?</h2>
            <button
              onClick={() => setStage("destination")}
              className="mt-4 flex w-full items-center gap-3 rounded-xl bg-muted px-4 py-3.5 text-left"
            >
              <Search className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Buscar destino</span>
            </button>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Quick icon={<HomeIcon className="size-4" />} label="Casa" subtitle="Adicionar" />
              <Quick icon={<Briefcase className="size-4" />} label="Trabalho" subtitle="Adicionar" />
            </div>
          </>
        )}

        {stage === "destination" && (
          <div className="space-y-3">
            <h2 className="text-lg font-extrabold">Confirme sua rota</h2>
            <Field icon="dot-green" value={origin} onChange={setOrigin} />
            <Field icon="dot-red" value={destination} onChange={setDestination} placeholder="Destino" autoFocus />
            <div className="rounded-xl bg-muted p-3 text-xs">
              <div className="flex justify-between"><span>Distância</span><b>{estDistance} km</b></div>
              <div className="mt-1 flex justify-between"><span>Tempo</span><b>{estDuration} min</b></div>
              <div className="mt-1 flex justify-between text-sm"><span>Valor estimado</span><b>R$ {estFare.toFixed(2)}</b></div>
            </div>
            <Button className="h-12 w-full text-sm font-bold" onClick={handleRequest}>
              Solicitar corrida
            </Button>
          </div>
        )}

        {stage === "searching" && (
          <div className="py-8 text-center">
            <div className="mx-auto grid size-16 place-items-center">
              <div className="relative size-6">
                <span className="rm-pulse absolute inset-0 block size-6 rounded-full" />
                <span className="relative z-10 block size-6 rounded-full bg-primary" />
              </div>
            </div>
            <p className="mt-4 text-base font-bold">Procurando motoristas próximos…</p>
            <p className="mt-1 text-xs text-muted-foreground">Buscando o melhor parceiro para você</p>
            <Button variant="outline" className="mt-6 h-10 px-6 text-sm" onClick={() => setStage("idle")}>
              Cancelar
            </Button>
          </div>
        )}

        {stage === "matched" && (
          <div>
            <span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-secondary">
              Motorista a caminho · 4 min
            </span>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid size-14 place-items-center rounded-full bg-secondary text-primary text-lg font-extrabold">JM</div>
              <div className="flex-1">
                <p className="text-base font-bold">João Mendes</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3 fill-primary text-primary" /> 4.92 · Honda Civic Preto
                </p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-1.5 text-xs font-extrabold tracking-widest">
                ABC-1D23
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="outline" className="h-11 text-xs">Chat</Button>
              <Button variant="outline" className="h-11 text-xs">Ligar</Button>
              <Button variant="destructive" className="h-11 text-xs">SOS</Button>
            </div>
            <Button variant="ghost" className="mt-2 h-10 w-full text-xs" onClick={() => setStage("idle")}>
              Cancelar corrida
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Quick({ icon, label, subtitle }: { icon: React.ReactNode; label: string; subtitle: string }) {
  return (
    <button className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left">
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-secondary">{icon}</span>
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function Field({
  icon, value, onChange, placeholder, autoFocus,
}: {
  icon: "dot-green" | "dot-red"; value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
      <span className={`size-3 rounded-full ${icon === "dot-green" ? "bg-emerald-500" : "bg-red-500"}`} />
      <MapPin className="size-4 text-muted-foreground" />
      <Input
        className="border-0 bg-transparent px-0 focus-visible:ring-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}
