import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

const search = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["passenger", "driver"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Entrar — RotaMais" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "signin", role = "passenger" } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [accountType, setAccountType] = useState<"passenger" | "driver">(role);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/home",
            data: { full_name: fullName, phone, account_type: accountType },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail.");
        navigate({ to: "/home" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/home",
    });
    if (res.error) {
      toast.error("Erro ao entrar com Google");
      setLoading(false);
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen bg-secondary text-secondary-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-2 text-sm text-secondary-foreground/70 hover:text-secondary-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="mt-8 flex items-center gap-3">
          <Logo size={48} />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">RotaMais</p>
            <h1 className="text-2xl font-extrabold">
              {tab === "signin" ? "Entrar" : "Criar conta"}
            </h1>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-background p-6 text-foreground shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className={`rounded-lg py-2 text-sm font-semibold transition ${tab === "signin" ? "bg-background shadow" : "text-muted-foreground"}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={`rounded-lg py-2 text-sm font-semibold transition ${tab === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}
            >
              Cadastrar
            </button>
          </div>

          {tab === "signup" && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Tipo de conta</p>
              <div className="grid grid-cols-2 gap-2">
                {(["passenger", "driver"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAccountType(r)}
                    className={`rounded-xl border-2 p-3 text-left transition ${
                      accountType === r ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <p className="text-sm font-bold">
                      {r === "passenger" ? "Passageiro" : "Motorista"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r === "passenger" ? "Peça corridas" : "Dirija e ganhe"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {tab === "signup" && (
              <>
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-0000"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="h-11 w-full text-sm font-bold" disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : tab === "signin" ? (
                "Entrar"
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="h-11 w-full text-sm font-semibold"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon /> Continuar com Google
          </Button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com os Termos e a Política de Privacidade do RotaMais.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.85 0-5.27-1.93-6.13-4.52H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.87 14.11A6.97 6.97 0 015.5 12c0-.73.13-1.44.37-2.11V7.05H2.18A11 11 0 001 12c0 1.78.43 3.46 1.18 4.95l3.69-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.69 2.84C6.73 7.31 9.15 5.38 12 5.38z"
      />
    </svg>
  );
}
