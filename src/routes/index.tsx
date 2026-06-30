import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Car, MapPin, Navigation, Shield, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RotaMais — Sua mobilidade urbana, simplificada" },
      {
        name: "description",
        content:
          "Solicite corridas, dirija e ganhe. RotaMais conecta passageiros e motoristas em tempo real.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-lg font-extrabold tracking-tight">RotaMais</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-1 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:opacity-90"
            >
              Criar conta <ArrowRight className="size-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-secondary">
              <Sparkles className="size-3.5" /> Nova experiência
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Vá para qualquer lugar com o <span className="text-primary">RotaMais</span>.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              Solicite uma corrida em segundos, acompanhe o motorista no mapa e pague do seu jeito.
              Para motoristas: trabalhe quando quiser e tenha total controle dos seus ganhos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signin", role: "passenger" }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-105"
              >
                Sou passageiro
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin", role: "driver" }}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground hover:opacity-90"
              >
                Quero dirigir
              </Link>
              <Link
                to="/admin-access"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground hover:bg-accent"
              >
                Acesso admin
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
              <Feat icon={<Zap className="size-4" />} label="Tempo real" />
              <Feat icon={<Shield className="size-4" />} label="Seguro" />
              <Feat icon={<MapPin className="size-4" />} label="Em toda cidade" />
            </div>
          </div>
          <div className="relative">
            <div className="rm-map rm-grid relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-card)]">
              {/* Fake roads and active route */}
              <svg
                className="absolute inset-0 size-full"
                viewBox="0 0 400 500"
                preserveAspectRatio="none"
              >
                {/* Secondary grid lines for details */}
                <path
                  d="M0,100 L400,100 M0,200 L400,200 M0,300 L400,300 M0,400 L400,400 M100,0 L100,500 M200,0 L200,500 M300,0 L300,500"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-border/30"
                />

                {/* Base roads */}
                <path
                  d="M-50,220 C100,180 200,350 450,300"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted-foreground/15"
                  fill="none"
                />
                <path
                  d="M120,-50 C80,150 320,300 280,550"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted-foreground/15"
                  fill="none"
                />
                <path
                  d="M0,50 C150,120 250,50 400,120"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted-foreground/15"
                  fill="none"
                />
                <path
                  d="M0,380 C120,400 250,320 400,450"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted-foreground/15"
                  fill="none"
                />

                {/* Road centerlines */}
                <path
                  d="M-50,220 C100,180 200,350 450,300"
                  stroke="var(--background)"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  fill="none"
                  className="opacity-40"
                />
                <path
                  d="M120,-50 C80,150 320,300 280,550"
                  stroke="var(--background)"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  fill="none"
                  className="opacity-40"
                />

                {/* Active Route Glow */}
                <path
                  d="M100,380 C130,300 280,320 280,150"
                  stroke="var(--primary)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  className="opacity-30"
                />

                {/* Active Route Dash */}
                <path
                  d="M100,380 C130,300 280,320 280,150"
                  stroke="var(--primary)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="14 10"
                  className="animate-route-dash"
                />
              </svg>

              {/* Uber-like Compass */}
              <div className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-background/90 shadow-[var(--shadow-soft)] backdrop-blur">
                <Navigation className="size-4 text-secondary rotate-45" />
              </div>

              {/* Start Pin (Av. Paulista) */}
              <div className="absolute left-[25%] top-[76%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="relative flex size-5 items-center justify-center rounded-full bg-background border-2 border-secondary shadow-md">
                  <div className="size-1.5 rounded-full bg-secondary" />
                </div>
                <div className="mt-1 rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground shadow whitespace-nowrap">
                  Av. Paulista
                </div>
              </div>

              {/* Destination Pin (Aeroporto) */}
              <div className="absolute left-[70%] top-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="relative flex size-6 items-center justify-center rounded-full bg-primary border-2 border-secondary shadow-md animate-bounce">
                  <MapPin className="size-3 fill-secondary text-secondary" />
                </div>
                <div className="mt-1 rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground shadow whitespace-nowrap">
                  Aeroporto
                </div>
              </div>

              {/* Active Car (on the route) */}
              <div className="absolute left-[41.25%] top-[61%] -translate-x-1/2 -translate-y-1/2 -rotate-[50deg]">
                <div className="grid size-8 place-items-center rounded-full bg-secondary border border-primary text-primary shadow-[var(--shadow-card)]">
                  <Car className="size-4" />
                </div>
              </div>

              {/* Nearby Driver 1 */}
              <div className="absolute left-[15%] top-[44%] -translate-x-1/2 -translate-y-1/2 rotate-[30deg] opacity-70">
                <div className="grid size-7 place-items-center rounded-full bg-background border border-border text-secondary shadow-[var(--shadow-soft)]">
                  <Car className="size-3.5" />
                </div>
              </div>

              {/* Nearby Driver 2 */}
              <div className="absolute left-[80%] top-[76%] -translate-x-1/2 -translate-y-1/2 rotate-[110deg] opacity-70">
                <div className="grid size-7 place-items-center rounded-full bg-background border border-border text-secondary shadow-[var(--shadow-soft)]">
                  <Car className="size-3.5" />
                </div>
              </div>

              {/* Nearby Driver 3 */}
              <div className="absolute left-[65%] top-[18%] -translate-x-1/2 -translate-y-1/2 -rotate-[20deg] opacity-70">
                <div className="grid size-7 place-items-center rounded-full bg-background border border-border text-secondary shadow-[var(--shadow-soft)]">
                  <Car className="size-3.5" />
                </div>
              </div>

              {/* Bottom Card */}
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/90 p-4 shadow-[var(--shadow-soft)] backdrop-blur border border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Próxima corrida
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-foreground">
                      Av. Paulista → Aeroporto
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-secondary">
                      12 min
                    </span>
                    <p className="text-sm font-extrabold text-primary-foreground bg-primary px-2 py-0.5 rounded-lg shadow-sm">
                      R$ 32,90
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} RotaMais · Todos os direitos reservados
      </footer>
    </div>
  );
}

function Feat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className="text-primary">{icon}</span>
      <span className="font-semibold text-foreground">{label}</span>
    </div>
  );
}

function Logo() {
  return (
    <div className="grid size-9 place-items-center rounded-xl bg-secondary">
      <span className="text-base font-extrabold text-primary">R+</span>
    </div>
  );
}
