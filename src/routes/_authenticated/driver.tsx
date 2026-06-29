import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDriverState } from "@/lib/driver.functions";
import { getMe } from "@/lib/rotamais.functions";
import { DriverPremiumScreen } from "@/components/DriverPremiumScreen";
import { DriverOnboarding } from "@/components/DriverOnboarding";
import { ArrowLeft, Clock, Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/driver")({
  component: DriverRouteComponent,
});

function DriverRouteComponent() {
  const getDriverStateFn = useServerFn(getDriverState);
  const getMeFn = useServerFn(getMe);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
  });

  const driverQuery = useQuery({
    queryKey: ["driver-state"],
    queryFn: () => getDriverStateFn(),
  });

  if (meQuery.isLoading || driverQuery.isLoading) {
    return (
      <div className="grid h-screen place-items-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-amber-500" />
          <p className="text-sm text-zinc-400">Carregando painel do motorista...</p>
        </div>
      </div>
    );
  }

  const userId = meQuery.data?.profile?.id;
  const driver = driverQuery.data?.driver;
  const docs = driverQuery.data?.documents ?? [];

  // Se o cadastro de motorista não existir, renderiza o onboarding
  if (!driver || !userId) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-8 min-h-screen bg-background">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/profile" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-extrabold">Cadastro de Motorista</h1>
        </div>
        <DriverOnboarding
          userId={userId ?? ""}
          initialDocuments={docs}
          onDone={() => driverQuery.refetch()}
        />
      </div>
    );
  }

  // Se o cadastro estiver suspenso
  if (driver.is_suspended) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <ShieldAlert className="size-16 text-red-500 mb-4" />
        <h2 className="text-xl font-extrabold">Sua conta de motorista está suspensa</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-md font-medium">
          {driver.suspended_reason || "Entre em contato com o suporte para obter mais informações."}
        </p>
        <Link
          to="/profile"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-800 px-6 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Voltar para o perfil
        </Link>
      </div>
    );
  }

  // Se o cadastro ainda não foi verificado (aprovado) pelo administrador
  if (!driver.is_verified) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <Clock className="size-16 text-amber-500 mb-4 animate-pulse" />
        <h2 className="text-xl font-extrabold">Cadastro em análise</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-md font-medium">
          Seus dados e documentos estão em processo de validação pelo nosso time administrativo.
          Você receberá uma notificação quando seu perfil for ativado!
        </p>
        <Link
          to="/profile"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-800 px-6 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Voltar para o perfil
        </Link>
      </div>
    );
  }

  // Se estiver tudo ok e verificado, renderiza a tela de corridas do motorista
  return <DriverPremiumScreen />;
}
