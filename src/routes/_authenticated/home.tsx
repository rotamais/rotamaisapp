import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RealMap, type LatLng } from "@/components/RealMap";
import { VehicleCategoryPicker } from "@/components/VehicleCategoryPicker";
import { SearchingDriver } from "@/components/SearchingDriver";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Compass, Heart, Home as HomeIcon, Loader2, MapPin, Menu, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { requestRide } from "@/lib/rotamais.functions";
import { computeRoute, reverseGeocode, searchAddress } from "@/lib/maps.functions";
import { listSavedPlaces } from "@/lib/places.functions";
import { listNearbyDrivers, type NearbyDriver } from "@/lib/nearby-drivers.functions";
import type { VehicleCategory } from "@/lib/pricing";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: PassengerHome,
});

type Stage = "idle" | "destination" | "select" | "searching";
type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  address: string;
  lat: number;
  lng: number;
};

function PassengerHome() {
  const [stage, setStage] = useState<Stage>("idle");
  const [origin, setOrigin] = useState("Minha localização");
  const [originLL, setOriginLL] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState("");
  const [destLL, setDestLL] = useState<LatLng | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [route, setRoute] = useState<{
    distance_km: number;
    duration_min: number;
    coords?: [number, number][];
  } | null>(null);
  const [routing, setRouting] = useState(false);
  const [category, setCategory] = useState<VehicleCategory | null>(null);
  const [fare, setFare] = useState<number>(0);
  const [locating, setLocating] = useState(false);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const { user } = useSession();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "por aí";
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  const requestFn = useServerFn(requestRide);
  const reverseFn = useServerFn(reverseGeocode);
  const routeFn = useServerFn(computeRoute);
  const placesFn = useServerFn(listSavedPlaces);
  const searchFn = useServerFn(searchAddress);
  const nearbyFn = useServerFn(listNearbyDrivers);

  const { data: savedPlaces } = useQuery({
    queryKey: ["saved-places"],
    queryFn: () => placesFn(),
  });

  const { data: nearbyDrivers } = useQuery<NearbyDriver[]>({
    queryKey: ["nearby-drivers", originLL?.lat, originLL?.lng],
    queryFn: () =>
      nearbyFn({ data: { lat: originLL!.lat, lng: originLL!.lng, radiusKm: 5, limit: 12 } }),
    enabled: !!originLL,
    refetchInterval: 15000,
    staleTime: 10000,
  });

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

  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  async function onDestinationChange(v: string) {
    setDestination(v);
    setDestLL(null);
    setRoute(null);
    if (v.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        const results = await searchFn({
          data: { query: v, near: originLL ?? undefined },
        });
        setSuggestions(results);
      } catch (e) {
        console.warn(e);
      }
    }, 300);
  }

  async function pickSuggestion(s: Suggestion) {
    setDestination(s.address);
    setSuggestions([]);
    const ll = { lat: s.lat, lng: s.lng };
    setDestLL(ll);

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
      const ride = await requestFn({
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
      setActiveRideId(ride.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao solicitar");
      setStage("select");
    }
  }

  function resetRide() {
    setActiveRideId(null);
    setStage("idle");
    setDestination("");
    setDestLL(null);
    setRoute(null);
    setCategory(null);
    setSuggestions([]);
  }

  if (stage === "idle") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-3">
          <button className="grid size-10 place-items-center rounded-full bg-muted">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-secondary text-secondary-foreground text-sm font-bold">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </span>
            <span className="text-sm font-bold">Olá, {displayName}</span>
          </div>
          <NotificationBell />
        </header>

        <div className="px-4">
          <button
            onClick={async () => {
              if (!originLL) await locate();
              setStage("destination");
            }}
            className="flex w-full items-center gap-3 rounded-2xl bg-muted px-4 py-3.5 text-left shadow-[var(--shadow-soft)]"
          >
            {locating ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="size-4 text-muted-foreground" />
            )}
            <span className="flex-1 text-sm text-muted-foreground">
              {locating ? "Localizando você…" : "Para onde vamos?"}
            </span>
            <Search className="size-4 text-muted-foreground" />
          </button>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {(() => {
              const saved = (savedPlaces ?? []) as any[];
              const home = saved.find((p) => p.icon === "home");
              const work = saved.find((p) => p.icon === "work");
              const pickPlace = async (p: any) => {
                setDestination(p.address);
                setDestLL({ lat: Number(p.lat), lng: Number(p.lng) });
                if (!originLL) return;
                setRouting(true);
                try {
                  const r = await routeFn({
                    data: { origin: originLL, destination: { lat: Number(p.lat), lng: Number(p.lng) } },
                  });
                  setRoute(r);
                  setStage("select");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao calcular rota");
                } finally {
                  setRouting(false);
                }
              };
              return (
                <>
                  <Chip
                    icon={<HomeIcon className="size-4" />}
                    label="Casa"
                    onClick={() => (home ? pickPlace(home) : setStage("destination"))}
                  />
                  <Chip
                    icon={<Briefcase className="size-4" />}
                    label="Trabalho"
                    onClick={() => (work ? pickPlace(work) : setStage("destination"))}
                  />
                  <Chip
                    icon={<Compass className="size-4" />}
                    label="Passeios"
                    onClick={() => setStage("destination")}
                  />
                </>
              );
            })()}
          </div>
        </div>

        <div className="relative mt-3 flex-1 overflow-hidden">
          <RealMap
            className="absolute inset-0 h-full w-full"
            center={originLL ?? undefined}
            origin={originLL ?? undefined}
            drivers={(nearbyDrivers ?? []).map((d) => ({ id: d.id, lat: d.lat, lng: d.lng }))}
          />
        </div>

        <div className="rounded-t-3xl bg-card px-5 pt-4 pb-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold">Motoristas próximos</h3>
              <p className="text-[11px] text-muted-foreground">
                {originLL
                  ? `${nearbyDrivers?.length ?? 0} disponíveis num raio de 5 km`
                  : "Ative a localização para ver quem está por perto"}
              </p>
            </div>
            {(nearbyDrivers?.length ?? 0) > 0 && (
              <span className="text-xs font-semibold text-secondary">
                {nearbyDrivers && nearbyDrivers[0]
                  ? `${nearbyDrivers[0].distance_km.toFixed(1)} km`
                  : ""}
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {(nearbyDrivers ?? []).length === 0 && originLL && (
              <p className="text-xs text-muted-foreground">
                Nenhum motorista online no momento — tente novamente em instantes.
              </p>
            )}
            {(nearbyDrivers ?? []).map((d) => {
              const initial = (d.full_name ?? "?").trim().charAt(0).toUpperCase() || "?";
              return (
                <div key={d.id} className="flex w-14 shrink-0 flex-col items-center gap-1">
                  <span className="grid size-11 place-items-center overflow-hidden rounded-full bg-muted text-sm font-bold text-secondary">
                    {d.avatar_url ? (
                      <img src={d.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      initial
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                    {d.distance_km < 1
                      ? `${Math.round(d.distance_km * 1000)} m`
                      : `${d.distance_km.toFixed(1)} km`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative h-[52vh] min-h-[380px] w-full">
        <RealMap
          className="h-full w-full"
          center={originLL ?? undefined}
          origin={originLL ?? undefined}
          destination={destLL ?? undefined}
          routeCoords={route?.coords}
        />
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
          <button className="pointer-events-auto grid size-10 place-items-center rounded-full bg-background shadow-[var(--shadow-soft)]">
            <Menu className="size-5" />
          </button>
          <span className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
            RotaMais
          </span>
          <NotificationBell />
        </header>
      </div>

      <div className="-mt-8 rounded-t-3xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />


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
                        <span className="block text-[11px] text-muted-foreground">
                          {s.secondary}
                        </span>
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
            <Button
              variant="ghost"
              className="h-10 w-full text-xs"
              onClick={() => setStage("destination")}
            >
              Alterar destino
            </Button>
          </div>
        )}

        {stage === "searching" && activeRideId && (
          <SearchingDriver rideId={activeRideId} onCancelled={resetRide} onCompleted={resetRide} />
        )}
      </div>
    </div>
  );
}

function Chip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)]"
    >
      <span className="text-secondary">{icon}</span>
      {label}
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
      <span
        className={`size-3 rounded-full ${icon === "dot-green" ? "bg-emerald-500" : "bg-red-500"}`}
      />
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
