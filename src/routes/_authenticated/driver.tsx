import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RealMap, type LatLng } from "@/components/RealMap";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ChevronRight,
  DollarSign,
  FileCheck,
  Loader2,
  Power,
  Settings2,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import { getDriverState, getDriverStats } from "@/lib/driver.functions";
import { updateDriverLocation } from "@/lib/rotamais.functions";
import { DriverOnboarding } from "@/components/DriverOnboarding";
import { DriverDocumentsManager } from "@/components/DriverDocumentsManager";
import { DriverVehicleSettings } from "@/components/DriverVehicleSettings";
import { AvailableRidesList } from "@/components/AvailableRidesList";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/driver")({
  component: DriverDashboard,
});

type Tab = "drive" | "documents" | "vehicle";

function DriverDashboard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const stateFn = useServerFn(getDriverState);
  const statsFn = useServerFn(getDriverStats);
  const locFn = useServerFn(updateDriverLocation);

  const state = useQuery({ queryKey: ["driver-state"], queryFn: () => stateFn() });
  const stats = useQuery({
    queryKey: ["driver-stats"],
    queryFn: () => statsFn(),
    enabled: !!state.data?.driver?.is_verified,
  });

  const [tab, setTab] = useState<Tab>("drive");
  const [online, setOnline] = useState(false);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [acceptedRideId, setAcceptedRideId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const driver = state.data?.driver;
  const vehicles = state.data?.vehicles ?? [];
  const documents = state.data?.documents ?? [];
  const isVerified = !!driver?.is_verified;
  const isSuspended = !!driver?.is_suspended;
  const hasOnboarded =
    !!driver && (driver.license_number?.length ?? 0) > 0 && vehicles.length > 0;
  const pendingDocs = documents.filter((d: any) => !d.verified).length;
  const primaryVehicle = vehicles[0];

  useEffect(() => {
    if (!online) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Geolocalização indisponível");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const ll = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(ll);
        locFn({ data: { lat: ll.lat, lng: ll.lng, is_online: true } }).catch(() => {});
      },
      (e) => console.warn(e),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [online, locFn]);

  useEffect(() => {
    return () => {
      if (online && pos) {
        locFn({ data: { lat: pos.lat, lng: pos.lng, is_online: false } }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualização em tempo real quando o admin aprova/revoga documentos ou status do motorista
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`driver-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents", filter: `user_id=eq.${user.id}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["driver-state"] });
          const next = (payload.new as any)?.verified;
          const prev = (payload.old as any)?.verified;
          if (next === true && prev !== true) toast.success("Documento aprovado pelo suporte");
          if (next === false && prev === true) toast.warning("Documento voltou para análise");
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["driver-state"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  async function toggleOnline() {
    if (!isVerified) {
      toast.error("Aguarde a aprovação do cadastro");
      return;
    }
    if (isSuspended) {
      toast.error("Sua conta está suspensa. Fale com o suporte.");
      return;
    }
    if (online) {
      if (pos) {
        await locFn({ data: { lat: pos.lat, lng: pos.lng, is_online: false } }).catch(() => {});
      }
      setOnline(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const ll = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(ll);
        try {
          await locFn({ data: { lat: ll.lat, lng: ll.lng, is_online: true } });
          setOnline(true);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erro ao ficar online");
        }
      },
      () => toast.error("Permita o acesso à localização"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (state.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className="mx-auto max-w-md p-5 pt-8">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
          Motorista RotaMais
        </span>
        <h1 className="mt-3 text-2xl font-extrabold">Complete seu cadastro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Em poucos passos você fica pronto para receber corridas.
        </p>
        <div className="mt-6 rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
          <DriverOnboarding
            userId={user?.id ?? ""}
            initialDocuments={documents}
            onDone={() => qc.invalidateQueries({ queryKey: ["driver-state"] })}
          />
        </div>
      </div>
    );
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["driver-state"] });

  return (
    <div className="mx-auto max-w-2xl">
      {/* Tabs estilo Uber Driver */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-3">
          <TabBtn active={tab === "drive"} onClick={() => setTab("drive")} label="Dirigir" />
          <TabBtn
            active={tab === "documents"}
            onClick={() => setTab("documents")}
            label="Documentos"
            badge={pendingDocs > 0 ? pendingDocs : undefined}
          />
          <TabBtn active={tab === "vehicle"} onClick={() => setTab("vehicle")} label="Veículo" />
        </div>
      </div>

      {tab === "drive" && (
        <div>
          <div className="relative h-[40vh] min-h-[300px]">
            <RealMap className="h-full w-full" center={pos ?? undefined} origin={pos ?? undefined} />
            <header className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
              <span className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
                Motorista
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-soft)] ${online ? "bg-emerald-500 text-white" : "bg-background text-muted-foreground"}`}
              >
                {online ? "Online" : "Offline"}
              </span>
            </header>
          </div>

          <div className="-mt-8 rounded-t-3xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

            {!isVerified && (
              <button
                onClick={() => setTab("documents")}
                className="mb-4 flex w-full items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left text-xs"
              >
                <div>
                  <p className="font-bold text-amber-700 dark:text-amber-300">Cadastro em análise</p>
                  <p className="mt-1 text-muted-foreground">
                    Acompanhe seus documentos e envie pendências.
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            )}

            {isSuspended && (
              <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
                <p className="font-bold text-destructive">Conta suspensa</p>
                <p className="mt-1 text-muted-foreground">
                  {driver?.suspended_reason ?? "Entre em contato com o suporte."}
                </p>
              </div>
            )}

            <Button
              onClick={toggleOnline}
              disabled={!isVerified || isSuspended}
              className={`h-14 w-full text-base font-extrabold ${online ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
            >
              <Power className="size-5" />
              {online ? "Ficar offline" : "Ficar online e receber corridas"}
            </Button>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat
                icon={<DollarSign className="size-4" />}
                label="Hoje"
                value={`R$ ${(stats.data?.earnings_today ?? 0).toFixed(0)}`}
              />
              <Stat
                icon={<Activity className="size-4" />}
                label="Corridas"
                value={String(stats.data?.rides_today ?? 0)}
              />
              <Stat
                icon={<Star className="size-4 fill-primary text-primary" />}
                label="Nota"
                value={(stats.data?.rating ?? 5).toFixed(2)}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Resumo da semana</h3>
                <TrendingUp className="size-4 text-emerald-500" />
              </div>
              <p className="mt-1 text-2xl font-extrabold">
                R$ {(stats.data?.earnings_week ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.data?.rides_week ?? 0} corridas
              </p>
              <div className="mt-3 flex h-12 items-end gap-1.5">
                {(stats.data?.daily ?? Array(7).fill(0)).map((v, i) => {
                  const max = Math.max(1, ...(stats.data?.daily ?? [1]));
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary"
                      style={{ height: `${Math.max(4, (v / max) * 100)}%`, opacity: v ? 1 : 0.2 }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <ShortcutCard
                icon={<FileCheck className="size-5" />}
                title="Documentos"
                desc={pendingDocs > 0 ? `${pendingDocs} em análise` : "Tudo em ordem"}
                onClick={() => setTab("documents")}
              />
              <ShortcutCard
                icon={<Settings2 className="size-5" />}
                title="Veículo"
                desc={primaryVehicle ? `${primaryVehicle.brand} ${primaryVehicle.model}` : "Configurar"}
                onClick={() => setTab("vehicle")}
              />
            </div>

            {online && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-bold">Pedidos disponíveis</h3>
                <AvailableRidesList onAccepted={(id) => setAcceptedRideId(id)} />
                {acceptedRideId && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Corrida aceita. Confira detalhes no histórico.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="p-4 pt-5">
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-xs">
            <ShieldCheck className={`size-5 ${isVerified ? "text-emerald-500" : "text-amber-500"}`} />
            <div className="flex-1">
              <p className="font-bold">
                {isVerified ? "Cadastro aprovado" : "Cadastro em análise"}
              </p>
              <p className="text-muted-foreground">
                A equipe RotaMais revisa novos documentos em até 24h.
              </p>
            </div>
          </div>
          <DriverDocumentsManager
            userId={user?.id ?? ""}
            documents={documents as any}
            vehicleId={primaryVehicle?.id}
            onChanged={refresh}
          />
        </div>
      )}

      {tab === "vehicle" && (
        <div className="space-y-3 p-4 pt-5">
          {primaryVehicle ? (
            <DriverVehicleSettings vehicle={primaryVehicle as any} onSaved={refresh} />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Nenhum veículo cadastrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative py-3 text-sm font-bold transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {badge ? (
        <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-extrabold text-white">
          {badge}
        </span>
      ) : null}
      {active && (
        <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-primary" />
      )}
    </button>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function ShortcutCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}
