import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RealMap, type LatLng } from "@/components/RealMap";
import { VehicleCategoryPicker } from "@/components/VehicleCategoryPicker";
import { SearchingDriver } from "@/components/SearchingDriver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Home as HomeIcon, Loader2, MapPin, Menu, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { requestRide } from "@/lib/rotamais.functions";
import { computeRoute, reverseGeocode } from "@/lib/maps.functions";
import type { VehicleCategory } from "@/lib/pricing";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: PassengerHome,
});

type Stage = "idle" | "destination" | "select" | "searching";
type Suggestion = { placeId: string; primary: string; secondary: string };

function PassengerHome() {
  const [stage, setStage] = useState<Stage>("idle");
  const [origin, setOrigin] = useState("Minha localização");
  const [originLL, setOriginLL] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState("");
  const [destLL, setDestLL] = useState<LatLng | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [route, setRoute] = useState<{ distance_km: number; duration_min: number; polyline?: string } | null>(null);
  const [routing, setRouting] = useState(false);
  const [category, setCategory] = useState<VehicleCategory | null>(null);
  const [fare, setFare] = useState<number>(0);
  const [locating, setLocating] = useState(false);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);

  const requestFn = useServerFn(requestRide);
  const reverseFn = useServerFn(reverseGeocode);
  const routeFn = useServerFn(computeRoute);

  const sessionTokenRef = useRef<any>(null);
  const placesReadyRef = useRef(false);

  // Pega localização atual no mount
  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function locate() {
    if (!navigator.geolocation) {
      toast.error("Geolocalização indisponível");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginLL(ll);
        try {
          const r = await reverseFn({ data: ll });
          setOrigin(r.address);
        } catch {
          /* ignore */
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error("Permita o acesso à localização para usar o RotaMais");
        console.warn(err);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function ensurePlaces() {
    if (placesReadyRef.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    const { AutocompleteSessionToken } = await g.maps.importLibrary("places");
    sessionTokenRef.current = new AutocompleteSessionToken();
    placesReadyRef.current = true;
  }

  async function onDestinationChange(v: string) {
    setDestination(v);
    setDestLL(null);
    setRoute(null);
    if (v.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    await ensurePlaces();
    const g = (window as any).google;
    if (!g?.maps) return;
    try {
      const { AutocompleteSuggestion } = await g.maps.importLibrary("places");
      const { suggestions: sugs } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: v,
        sessionToken: sessionTokenRef.current,
        language: "pt-BR",
        region: "br",
        locationBias: originLL
          ? { center: originLL, radius: 30000 }
          : undefined,
      });
      setSuggestions(
        (sugs ?? [])
          .filter((s: any) => s.placePrediction)
          .slice(0, 5)
          .map((s: any) => ({
            placeId: s.placePrediction.placeId,
            primary: s.placePrediction.mainText?.text ?? s.placePrediction.text?.text ?? "",
            secondary: s.placePrediction.secondaryText?.text ?? "",
          })),
      );
    } catch (e) {
      console.warn(e);
    }
  }

  async function pickSuggestion(s: Suggestion) {
    setDestination(`${s.primary}${s.secondary ? `, ${s.secondary}` : ""}`);
    setSuggestions([]);
    const g = (window as any).google;
    const { Place } = await g.maps.importLibrary("places");
    const place = new Place({ id: s.placeId, requestedLanguage: "pt-BR" });
    await place.fetchFields({ fields: ["location", "formattedAddress"] });
    const loc = place.location;
    const ll = { lat: loc.lat(), lng: loc.lng() };
    setDestLL(ll);
    sessionTokenRef.current = null;
    placesReadyRef.current = false;

    if (!originLL) {
      toast.error("Sem localização de origem");
      return;
    }
    setRouting(true);
    try {
      const r = await routeFn({ data: { origin: originLL, destination: ll } });
      setRoute(r);
      setStage("select");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao calcular rota");
    } finally {
      setRouting(false);
    }
  }

  async function handleRequest() {
    if (!originLL || !destLL || !route || !category) return;
    setStage("searching");
    try {
      await requestFn({
        data: {
          origin_address: origin,
          origin_lat: originLL.lat,
          origin_lng: originLL.lng,
          destination_address: destination,
          destination_lat: destLL.lat,
          destination_lng: destLL.lng,
          distance_km: route.distance_km,
          duration_min: route.duration_min,
          estimated_fare: fare,
          vehicle_category: category,
          payment_method: "card",
        },
      });
      setTimeout(() => setStage("matched"), 2200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao solicitar");
      setStage("select");
    }
  }

  return (
    <div className="relative">
      <div className="relative h-[52vh] min-h-[380px] w-full">
        <RealMap
          className="h-full w-full"
          center={originLL ?? undefined}
          origin={originLL ?? undefined}
          destination={destLL ?? undefined}
          polyline={route?.polyline}
        />
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
          <button className="pointer-events-auto grid size-10 place-items-center rounded-full bg-background shadow-[var(--shadow-soft)]">
            <Menu className="size-5" />
          </button>
          <span className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
            RotaMais
          </span>
          <div className="size-10" />
        </header>
      </div>

      <div className="-mt-8 rounded-t-3xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

        {stage === "idle" && (
          <>
            <h2 className="text-xl font-extrabold">Para onde vamos?</h2>
            <button
              onClick={async () => {
                if (!originLL) await locate();
                setStage("destination");
              }}
              className="mt-4 flex w-full items-center gap-3 rounded-xl bg-muted px-4 py-3.5 text-left"
            >
              {locating ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Search className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {locating ? "Localizando você…" : "Buscar destino"}
              </span>
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
            <Field icon="dot-green" value={origin} onChange={setOrigin} readOnly />
            <Field
              icon="dot-red"
              value={destination}
              onChange={onDestinationChange}
              placeholder="Para onde?"
              autoFocus
            />
            {routing && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Calculando rota…
              </p>
            )}
            {suggestions.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-border bg-background">
                {suggestions.map((s) => (
                  <li key={s.placeId}>
                    <button
                      onClick={() => pickSuggestion(s)}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted"
                    >
                      <MapPin className="mt-0.5 size-4 text-secondary" />
                      <span>
                        <span className="block text-sm font-semibold">{s.primary}</span>
                        <span className="block text-[11px] text-muted-foreground">{s.secondary}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {stage === "select" && route && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Escolha o veículo</h2>
              <span className="text-[11px] text-muted-foreground">
                {route.distance_km.toFixed(1)} km · {route.duration_min} min
              </span>
            </div>
            <VehicleCategoryPicker
              distanceKm={route.distance_km}
              durationMin={route.duration_min}
              selected={category}
              onSelect={(id, f) => {
                setCategory(id);
                setFare(f);
              }}
            />
            <Button
              className="h-12 w-full text-sm font-bold"
              disabled={!category}
              onClick={handleRequest}
            >
              {category ? `Solicitar · R$ ${fare.toFixed(2)}` : "Selecione uma categoria"}
            </Button>
            <Button variant="ghost" className="h-10 w-full text-xs" onClick={() => setStage("destination")}>
              Alterar destino
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
              <div className="grid size-14 place-items-center rounded-full bg-secondary text-primary text-lg font-extrabold">
                JM
              </div>
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
            <Button
              variant="ghost"
              className="mt-2 h-10 w-full text-xs"
              onClick={() => {
                setStage("idle");
                setDestination("");
                setDestLL(null);
                setRoute(null);
                setCategory(null);
              }}
            >
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
  icon,
  value,
  onChange,
  placeholder,
  autoFocus,
  readOnly,
}: {
  icon: "dot-green" | "dot-red";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
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
        readOnly={readOnly}
      />
    </div>
  );
}
