import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDriverEarnings } from "@/lib/driver.functions";
import { Loader2, MapPin, TrendingUp } from "lucide-react";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type Period = "week" | "month" | "year";
const LABEL: Record<Period, string> = { week: "Semana", month: "Mês", year: "Ano" };

export function DriverEarnings() {
  const fn = useServerFn(getDriverEarnings);
  const [period, setPeriod] = useState<Period>("week");
  const { data, isLoading } = useQuery({
    queryKey: ["driver-earnings", period],
    queryFn: () => fn({ data: { period } }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1 text-xs font-bold">
        {(["week", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full py-2 transition-colors ${
              period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {LABEL[p]}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Total em {LABEL[period].toLowerCase()}
        </p>
        <p className="mt-1 text-3xl font-extrabold">
          {isLoading ? "—" : BRL.format(data?.total ?? 0)}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
          <TrendingUp className="size-3.5" />
          {data?.count ?? 0} corridas · {Number(data?.distance ?? 0).toFixed(1)} km · média{" "}
          {BRL.format(data?.avg ?? 0)}
        </div>

        <div className="mt-5">
          <div className="flex h-28 items-end gap-1">
            {(data?.buckets ?? Array(7).fill(0)).map((v: number, i: number) => {
              const max = Math.max(1, ...(data?.buckets ?? [1]));
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary transition-all"
                    style={{
                      height: `${Math.max(4, (v / max) * 100)}%`,
                      opacity: v ? 1 : 0.18,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1">
            {(data?.labels ?? []).map((l: string, i: number) => (
              <span key={i} className="flex-1 text-center text-[9px] font-medium text-muted-foreground">
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold">Corridas concluídas</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (data?.rides?.length ?? 0) === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Nenhuma corrida no período.
          </p>
        ) : (
          <ul className="space-y-2">
            {data!.rides.map((r: any) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="flex items-center gap-1 truncate text-xs">
                      <MapPin className="size-3 text-emerald-500" />
                      {r.origin_address}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs">
                      <MapPin className="size-3 text-amber-500" />
                      {r.destination_address}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.completed_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {r.distance_km ? ` · ${Number(r.distance_km).toFixed(1)} km` : ""}
                    </p>
                  </div>
                  <p className="text-base font-extrabold">{BRL.format(Number(r.final_fare ?? 0))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
