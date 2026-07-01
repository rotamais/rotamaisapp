import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRides } from "@/lib/rotamais.functions";
import { MapPin, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: History,
});

function History() {
  const fn = useServerFn(getMyRides);
  const { data, isLoading } = useQuery({
    queryKey: ["my-rides"],
    queryFn: () => fn(),
  });

  return (
    <div className="mx-auto max-w-2xl px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <h1 className="text-2xl font-extrabold">Suas viagens</h1>
      <p className="mt-1 text-sm text-muted-foreground">Histórico de corridas e avaliações</p>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && (!data || data.length === 0) && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold">Nenhuma viagem ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sua primeira corrida aparecerá aqui.
            </p>
          </div>
        )}
        {data?.map((r: any) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
                <div className="mt-2 flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-emerald-500" />
                  <p className="text-sm font-medium">{r.origin_address}</p>
                </div>
                <div className="mt-1 flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-red-500" />
                  <p className="text-sm font-medium">{r.destination_address}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold">
                  R$ {Number(r.final_fare ?? r.estimated_fare ?? 0).toFixed(2)}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                  <Star className="size-3 fill-primary text-primary" />{" "}
                  {Number(r.distance_km ?? 0).toFixed(1)} km
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {r.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
