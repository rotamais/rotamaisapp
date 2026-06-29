import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { getDriverState } from "@/lib/driver.functions";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DriverDocumentsManager } from "@/components/DriverDocumentsManager";
import { DriverVehicleSettings } from "@/components/DriverVehicleSettings";
import { DriverEarnings } from "@/components/DriverEarnings";
import { Loader2, LogOut, Menu, User } from "lucide-react";

export function DriverMenu() {
  const [open, setOpen] = useState(false);
  const stateFn = useServerFn(getDriverState);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["driver-state"],
    queryFn: () => stateFn(),
    enabled: open,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const vehicle = data?.vehicles?.[0];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="grid size-10 place-items-center rounded-full bg-zinc-900/85 text-white shadow-lg backdrop-blur"
          aria-label="Menu do motorista"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="text-left text-lg font-extrabold">Painel do motorista</SheetTitle>
        </SheetHeader>

        <div className="p-4">
          <Tabs defaultValue="earnings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="earnings">Ganhos</TabsTrigger>
              <TabsTrigger value="docs">Documentos</TabsTrigger>
              <TabsTrigger value="vehicle">Veículo</TabsTrigger>
            </TabsList>

            <TabsContent value="earnings" className="mt-4">
              <DriverEarnings />
            </TabsContent>

            <TabsContent value="docs" className="mt-4">
              {isLoading || !data ? (
                <Loader />
              ) : (
                <DriverDocumentsManager
                  userId={(data.driver as any)?.id ?? ""}
                  documents={data.documents as any}
                  vehicleId={vehicle?.id}
                  onChanged={() => refetch()}
                />
              )}
            </TabsContent>

            <TabsContent value="vehicle" className="mt-4">
              {isLoading || !data ? (
                <Loader />
              ) : vehicle ? (
                <DriverVehicleSettings vehicle={vehicle as any} onSaved={() => refetch()} />
              ) : (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhum veículo cadastrado ainda.
                </p>
              )}
            </TabsContent>
          </Tabs>

          <Button
            variant="default"
            className="mt-4 h-11 w-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/home" });
            }}
          >
            <User className="size-4" /> Modo Passageiro
          </Button>

          <Button
            variant="outline"
            className="mt-6 h-11 w-full text-sm font-semibold"
            onClick={signOut}
          >
            <LogOut className="size-4" /> Sair da conta
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
