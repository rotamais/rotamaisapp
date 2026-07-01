import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin-access")({
  head: () => ({ meta: [{ title: "Admin — RotaMais" }] }),
  component: AdminAccessPage,
});

function AdminAccessPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("rotamais@rotamais.app");
  const [password, setPassword] = useState("12345678@");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const role = data.user?.email === "rotamais@rotamais.app" ? "admin" : null;
      if (!role) {
        throw new Error("Credenciais inválidas para acesso administrativo");
      }
      toast.success("Acesso administrador liberado");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      if ((err as any)?.code === "redirect") return;
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">RotaMais</p>
              <h1 className="text-xl font-extrabold">Acesso administrativo</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar no painel"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Use este acesso apenas para operação administrativa interna.
          </p>
        </div>
      </div>
    </div>
  );
}
