import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Banknote, CreditCard, Plus, QrCode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: Wallet,
});

function Wallet() {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <h1 className="text-2xl font-extrabold">Carteira</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pagamentos, saques e extrato</p>

      <div className="mt-5 rounded-3xl bg-secondary p-5 text-secondary-foreground">
        <p className="text-xs font-semibold opacity-70">Saldo disponível</p>
        <p className="mt-1 text-3xl font-extrabold text-primary">R$ 124,50</p>
        <div className="mt-4 flex gap-2">
          <Button className="h-10 flex-1">Adicionar</Button>
          <Button
            variant="outline"
            className="h-10 flex-1 border-secondary-foreground/20 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10"
          >
            Sacar
          </Button>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Formas de pagamento
      </h2>
      <div className="mt-3 space-y-2">
        <PayItem
          icon={<CreditCard className="size-4" />}
          title="Visa •••• 4242"
          subtitle="Principal"
        />
        <PayItem icon={<QrCode className="size-4" />} title="PIX" subtitle="Chave: cpf@rotamais" />
        <PayItem
          icon={<Banknote className="size-4" />}
          title="Dinheiro"
          subtitle="Pagar ao motorista"
        />
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-3 text-sm font-semibold text-muted-foreground">
          <Plus className="size-4" /> Adicionar método
        </button>
      </div>
    </div>
  );
}

function PayItem({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-secondary">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
