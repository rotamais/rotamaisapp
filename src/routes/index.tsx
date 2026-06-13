import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Shield, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RotaMais — Sua mobilidade urbana, simplificada" },
      { name: "description", content: "Solicite corridas, dirija e ganhe. RotaMais conecta passageiros e motoristas em tempo real." },
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
            <Link to="/auth" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex">
              Entrar
            </Link>
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
                search={{ mode: "signup", role: "passenger" }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-105"
              >
                Sou passageiro
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup", role: "driver" }}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground hover:opacity-90"
              >
                Quero dirigir
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
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative size-4">
                  <span className="rm-pulse absolute inset-0 block size-4 rounded-full" />
                  <span className="relative z-10 block size-4 rounded-full bg-primary ring-4 ring-background" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/90 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
                <p className="text-xs font-semibold text-muted-foreground">Próxima corrida</p>
                <p className="mt-1 text-sm font-bold">Av. Paulista → Aeroporto</p>
                <p className="mt-1 text-xs text-muted-foreground">12 min · R$ 32,90</p>
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
