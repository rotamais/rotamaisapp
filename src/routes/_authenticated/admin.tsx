import { createFileRoute } from "@tanstack/react-router";
import { Activity, Car, DollarSign, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

function AdminPanel() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Painel administrativo</h1>
          <p className="text-sm text-muted-foreground">Visão geral em tempo real</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
          ● Ao vivo
        </span>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI icon={<Users className="size-4" />} label="Usuários ativos" value="12.483" delta="+4,2%" />
        <KPI icon={<Car className="size-4" />} label="Motoristas online" value="318" delta="+12" />
        <KPI icon={<Activity className="size-4" />} label="Corridas hoje" value="1.926" delta="+8,9%" />
        <KPI icon={<DollarSign className="size-4" />} label="Faturamento" value="R$ 48.7k" delta="+15%" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Corridas por hora</h2>
          </div>
          <div className="mt-4 flex h-40 items-end gap-1.5">
            {[20, 35, 28, 50, 42, 65, 78, 72, 88, 95, 80, 60].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary" style={{ height: `${h}%`, opacity: 0.4 + h / 200 }} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Aprovações pendentes</h2>
          <ul className="mt-3 space-y-2">
            {["Maria Souza", "Carlos Lima", "Ana Beatriz", "João P. Silva"].map((n) => (
              <li key={n} className="flex items-center justify-between rounded-xl border border-border p-2.5">
                <span className="text-sm font-semibold">{n}</span>
                <div className="flex gap-1">
                  <button className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-700">Aprovar</button>
                  <button className="rounded-md bg-destructive/15 px-2 py-1 text-[11px] font-bold text-destructive">Rejeitar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Tile title="Tempo médio" value="14 min" sub="por corrida" />
        <Tile title="Corridas concluídas" value="98,3%" sub="taxa de sucesso" />
        <Tile title="Canceladas" value="1,7%" sub="últimas 24h" />
      </section>
    </div>
  );
}

function KPI({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-lg bg-muted text-secondary">{icon}</span>
        <span className="text-[11px] font-bold text-emerald-600">{delta}</span>
      </div>
      <p className="mt-3 text-xl font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Tile({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
