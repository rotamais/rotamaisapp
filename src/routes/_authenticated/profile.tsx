import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/rotamais.functions";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ChevronRight, LogOut, Settings, Shield, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const fn = useServerFn(getMe);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => fn() });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (data?.profile?.full_name ?? "U R")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="flex items-center gap-4">
        <div className="grid size-16 place-items-center rounded-full bg-secondary text-xl font-extrabold text-primary">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-extrabold">{data?.profile?.full_name ?? "Sua conta"}</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-3.5 fill-primary text-primary" />
            {Number(data?.profile?.rating ?? 5).toFixed(2)} · {data?.profile?.total_rides ?? 0}{" "}
            corridas
          </p>
          {data?.roles?.length ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {data.roles.map((r: string) => (
                <span
                  key={r}
                  className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary"
                >
                  {r}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Row icon={<Settings className="size-4" />} label="Editar perfil" />
        <Row icon={<Bell className="size-4" />} label="Notificações" />
        <Row icon={<Shield className="size-4" />} label="Segurança e LGPD" />
        {data?.roles?.includes("admin") && (
          <Row icon={<Shield className="size-4" />} label="Painel administrativo" to="/admin" />
        )}
      </div>

      <Button
        variant="outline"
        className="mt-6 h-11 w-full text-sm font-semibold"
        onClick={signOut}
      >
        <LogOut className="size-4" /> Sair da conta
      </Button>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        RotaMais v1.0 · feito com cuidado
      </p>
    </div>
  );
}

function Row({ icon, label, to }: { icon: React.ReactNode; label: string; to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => to && navigate({ to })}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left"
    >
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-secondary">
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}
