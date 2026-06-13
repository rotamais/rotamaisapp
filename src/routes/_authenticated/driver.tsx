import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapMock } from "@/components/MapMock";
import { Button } from "@/components/ui/button";
import { Activity, DollarSign, Power, Star, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/driver")({
  component: DriverDashboard,
});

function DriverDashboard() {
  const [online, setOnline] = useState(false);

  return (
    <div>
      <div className="relative h-[48vh] min-h-[360px]">
        <MapMock className="h-full w-full" pin={{ label: "Você" }} />
        <header className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
          <span className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
            Motorista
          </span>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-soft)] ${online ? "bg-emerald-500 text-white" : "bg-background text-muted-foreground"}`}>
            {online ? "Online" : "Offline"}
          </span>
        </header>
      </div>

      <div className="-mt-8 rounded-t-3xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

        <Button
          onClick={() => setOnline((v) => !v)}
          className={`h-14 w-full text-base font-extrabold ${online ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
        >
          <Power className="size-5" />
          {online ? "Ficar offline" : "Ficar online e receber corridas"}
        </Button>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat icon={<DollarSign className="size-4" />} label="Hoje" value="R$ 187" />
          <Stat icon={<Activity className="size-4" />} label="Corridas" value="9" />
          <Stat icon={<Star className="size-4 fill-primary text-primary" />} label="Nota" value="4.94" />
        </div>

        <div className="mt-5 rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Resumo da semana</h3>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <p className="mt-1 text-2xl font-extrabold">R$ 1.284,50</p>
          <p className="text-xs text-muted-foreground">47 corridas · 38h online</p>
          <div className="mt-3 flex gap-1.5">
            {[40, 65, 30, 80, 55, 70, 90].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/30" style={{ height: `${h * 0.6}px` }}>
                <div className="h-full rounded-t bg-primary" style={{ opacity: h / 100 }} />
              </div>
            ))}
          </div>
        </div>

        {online && (
          <div className="mt-4 rounded-2xl bg-secondary p-4 text-secondary-foreground">
            <p className="text-xs font-semibold text-primary">Nova corrida disponível</p>
            <p className="mt-1 text-base font-bold">Vila Madalena → Itaim Bibi</p>
            <p className="text-xs opacity-70">5,3 km · R$ 24,90</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-10 border-secondary-foreground/20 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10">
                Recusar
              </Button>
              <Button className="h-10">Aceitar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
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
