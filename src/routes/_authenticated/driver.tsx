import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RealMap, type LatLng } from "@/components/RealMap";
import {
  Activity,
  DollarSign,
  FileCheck,
  Loader2,
  Settings2,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { getDriverState, getDriverStats } from "@/lib/driver.functions";
import { updateDriverLocation } from "@/lib/rotamais.functions";
import { DriverOnboarding } from "@/components/DriverOnboarding";
import { DriverDocumentsManager } from "@/components/DriverDocumentsManager";
import { DriverVehicleSettings } from "@/components/DriverVehicleSettings";
import { DriverEarnings } from "@/components/DriverEarnings";
import { IncomingRideCard } from "@/components/IncomingRideCard";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/driver")({
  component: DriverDashboard,
});

type Tab = "drive" | "earnings" | "documents" | "vehicle";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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
    refetchInterval: 60_000,
  });

  const [tab, setTab] = useState<Tab>("drive");
  const [pos, setPos] = useState<LatLng | null>(null);
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
  const ready = isVerified && !isSuspended && hasOnboarded;

  // Tempo real: documentos/driver alterados pelo admin atualizam o painel
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`driver-self-${user.id}`)
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

  // Driver fica disponível automaticamente quando o painel está aberto e o cadastro está ok.
  // Nada de botão online/offline — segue o padrão Uber/99: abriu o app, está dirigindo.
  useEffect(() => {
    if (!ready) return;
    if (!navigator.geolocation) {
      toast.error("Geolocalização indisponível. Não será possível receber corridas.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const ll = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(ll);
        locFn({ data: { lat: ll.lat, lng: ll.lng, is_online: true } }).catch(() => {});
      },
      () => toast.error("Permita o acesso à localização para receber corridas"),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Marca offline ao desmontar
      locFn({
        data: { lat: pos?.lat ?? 0, lng: pos?.lng ?? 0, is_online: false },
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

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
    <div className="mx-auto max-w-2xl pb-24">
      {/* Pop-up de corrida com aviso sonoro */}
      {ready && tab === "drive" && (
        <IncomingRideCard
          enabled={ready}
          onAccepted={() => {
            qc.invalidateQueries({ queryKey: ["driver-state"] });
            toast("Siga até o ponto de embarque");
          }}
        />
      )}

      {/* Tabs estilo Uber Driver */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-4">
          <TabBtn active={tab === "drive"} onClick={() => setTab("drive")} label="Dirigir" />
          <TabBtn active={tab === "earnings"} onClick={() => setTab("earnings")} label="Ganhos" />
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
          <div className="relative h-[55vh] min-h-[360px]">
            <RealMap className="h-full w-full" center={pos ?? undefined} origin={pos ?? undefined} />
            <header className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
              <span className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
                {primaryVehicle ? `${primaryVehicle.brand} ${primaryVehicle.model}` : "Motorista"}
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-soft)] ${
                  ready ? "bg-emerald-500 text-white" : "bg-background text-muted-foreground"
                }`}
              >
                {ready ? "Aguardando corridas" : isVerified ? "Inativo" : "Em análise"}
              </span>
            </header>
          </div>

          <div className="-mt-8 rounded-t-3xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

            {!isVerified && (
              <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                <p className="font-bold text-amber-700 dark:text-amber-300">Cadastro em análise</p>
                <p className="mt-1 text-muted-foreground">
                  Você começa a receber corridas assim que o suporte aprovar seus documentos.
                </p>
              </div>
            )}

            {isSuspended && (
              <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
                <p className="font-bold text-destructive">Conta suspensa</p>
                <p className="mt-1 text-muted-foreground">
                  {driver?.suspended_reason ?? "Entre em contato com o suporte."}
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-primary/5 p-4 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {ready ? "Pronto para corridas" : "Quase lá"}
              </p>
              <p className="mt-1 font-bold">
                {ready
                  ? "Vamos te avisar com um som assim que uma corrida aparecer."
                  : "Finalize o cadastro e aprovação para ativar as corridas."}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat
                icon={<DollarSign className="size-4" />}
                label="Hoje"
                value={BRL.format(stats.data?.earnings_today ?? 0)}
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

            <div className="mt-5 grid grid-cols-3 gap-3">
              <ShortcutCard
                icon={<Wallet className="size-5" />}
                title="Ganhos"
                desc="Semana, mês e ano"
                onClick={() => setTab("earnings")}
              />
              <ShortcutCard
                icon={<FileCheck className="size-5" />}
                title="Documentos"
                desc={pendingDocs > 0 ? `${pendingDocs} em análise` : "Tudo em ordem"}
                onClick={() => setTab("documents")}
              />
              <ShortcutCard
                icon={<Settings2 className="size-5" />}
                title="Veículo"
                desc={primaryVehicle ? primaryVehicle.plate : "Configurar"}
                onClick={() => setTab("vehicle")}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "earnings" && (
        <div className="p-4 pt-5">
          <DriverEarnings />
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
      className="rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
    >
      <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
        {icon}
      </span>
      <p className="mt-2 text-sm font-bold">{title}</p>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </button>
  );
}
