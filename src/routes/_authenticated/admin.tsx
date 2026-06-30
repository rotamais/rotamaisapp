import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Car,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Search,
  ShieldOff,
  Users,
  XCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminApproveDriver,
  adminDashboard,
  adminDriverDocuments,
  adminFinance,
  adminListDrivers,
  adminListRides,
  adminListUsers,
  adminProcessWithdrawal,
  adminSetUserBlocked,
  adminSuspendDriver,
  adminUpdatePlatformFee,
  adminUserHistory,
  adminApproveDocument,
  adminRevokeDocument,
} from "@/lib/admin.functions";
import { getSupabaseEnv } from "@/integrations/supabase/env";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function AdminPanel() {
  const { url, publishableKey } = getSupabaseEnv();
  const hasSupabaseConfig = Boolean(url && publishableKey);

  if (!hasSupabaseConfig) {
    return <LocalAdminPanel />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Painel administrativo</h1>
          <p className="text-sm text-muted-foreground">Gestão completa da RotaMais</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
          ● Ao vivo
        </span>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Passageiros</TabsTrigger>
          <TabsTrigger value="drivers">Motoristas</TabsTrigger>
          <TabsTrigger value="rides">Corridas</TabsTrigger>
          <TabsTrigger value="finance">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-5">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="users" className="mt-5">
          <UsersTab />
        </TabsContent>
        <TabsContent value="drivers" className="mt-5">
          <DriversTab />
        </TabsContent>
        <TabsContent value="rides" className="mt-5">
          <RidesTab />
        </TabsContent>
        <TabsContent value="finance" className="mt-5">
          <FinanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LocalAdminPanel() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Modo local</p>
            <h1 className="text-2xl font-extrabold">Painel administrativo pronto para uso</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              O acesso admin já está liberado com as credenciais padrões. As informações abaixo são de demonstração até que as chaves reais do Supabase sejam adicionadas.
            </p>
          </div>
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700">
            Local • sem banco remoto
          </span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Usuários ativos</p>
            <p className="mt-2 text-3xl font-extrabold">1</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Motoristas online</p>
            <p className="mt-2 text-3xl font-extrabold">0</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Corridas em andamento</p>
            <p className="mt-2 text-3xl font-extrabold">0</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
          Credenciais de acesso: <span className="font-semibold text-foreground">rotamais@rotamais.app</span> / <span className="font-semibold text-foreground">12345678@</span>
        </div>
      </div>
    </div>
  );
}

/* ============ DASHBOARD ============ */

function DashboardTab() {
  const fn = useServerFn(adminDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fn(),
    refetchInterval: 15000,
  });

  if (isLoading || !data) return <SkeletonGrid />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          icon={<Users className="size-4" />}
          label="Usuários"
          value={data.total_users.toLocaleString("pt-BR")}
        />
        <KPI
          icon={<Car className="size-4" />}
          label="Motoristas online"
          value={data.drivers_online.toString()}
        />
        <KPI
          icon={<Activity className="size-4" />}
          label="Corridas ativas"
          value={data.rides_in_progress.toString()}
        />
        <KPI
          icon={<CheckCircle2 className="size-4" />}
          label="Concluídas hoje"
          value={data.rides_completed_today.toString()}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <KPI
          icon={<DollarSign className="size-4" />}
          label="Receita hoje"
          value={BRL.format(data.revenue_today)}
        />
        <KPI
          icon={<DollarSign className="size-4" />}
          label="Receita 7 dias"
          value={BRL.format(data.revenue_week)}
        />
        <KPI
          icon={<DollarSign className="size-4" />}
          label="Receita 30 dias"
          value={BRL.format(data.revenue_month)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Mapa de veículos ativos ({data.online_drivers.length})
        </h2>
        <div className="relative mt-4 h-64 overflow-hidden rounded-xl bg-gradient-to-br from-muted to-muted/40">
          <div className="absolute inset-0 bg-[linear-gradient(transparent_24px,hsl(var(--border)/0.4)_25px),linear-gradient(90deg,transparent_24px,hsl(var(--border)/0.4)_25px)] bg-[length:25px_25px]" />
          {data.online_drivers.map((d: any, i: number) => (
            <div
              key={d.id}
              className="absolute size-3 rounded-full bg-primary ring-4 ring-primary/20"
              style={{
                left: `${((Number(d.current_lng ?? 0) + 180) / 360) * 100 || ((i * 13) % 90) + 5}%`,
                top: `${((90 - Number(d.current_lat ?? 0)) / 180) * 100 || ((i * 17) % 80) + 10}%`,
              }}
              title={`Driver ${d.id.slice(0, 6)} · ★ ${Number(d.rating ?? 5).toFixed(1)}`}
            />
          ))}
          {!data.online_drivers.length && (
            <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              Nenhum motorista online no momento
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ USERS ============ */

function UsersTab() {
  const listFn = useServerFn(adminListUsers);
  const blockFn = useServerFn(adminSetUserBlocked);
  const historyFn = useServerFn(adminUserHistory);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => listFn({ data: { search: search || undefined, limit: 100 } }),
  });

  const block = useMutation({
    mutationFn: (vars: { user_id: string; blocked: boolean }) => blockFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Conta atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: history } = useQuery({
    queryKey: ["admin-user-history", selectedUser],
    queryFn: () => historyFn({ data: { user_id: selectedUser! } }),
    enabled: !!selectedUser,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar passageiro por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Corridas</TableHead>
              <TableHead>★</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                <TableCell>{u.phone ?? "—"}</TableCell>
                <TableCell>{u.total_rides}</TableCell>
                <TableCell>{Number(u.rating ?? 5).toFixed(2)}</TableCell>
                <TableCell>
                  {u.is_blocked ? (
                    <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
                      Bloqueado
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      Ativo
                    </span>
                  )}
                </TableCell>
                <TableCell className="flex justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setSelectedUser(u.id)}>
                    Histórico
                  </Button>
                  <Button
                    size="sm"
                    variant={u.is_blocked ? "default" : "destructive"}
                    onClick={() => block.mutate({ user_id: u.id, blocked: !u.is_blocked })}
                  >
                    {u.is_blocked ? "Desbloquear" : "Bloquear"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!users?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Histórico de corridas</h3>
            <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>
              Fechar
            </Button>
          </div>
          <div className="space-y-2">
            {(history ?? []).map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {r.origin_address} → {r.destination_address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")} · {r.status}
                  </p>
                </div>
                <span className="font-bold">
                  {BRL.format(Number(r.final_fare ?? r.estimated_fare ?? 0))}
                </span>
              </div>
            ))}
            {!history?.length && <p className="text-sm text-muted-foreground">Sem corridas.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ DRIVERS ============ */

function DriversTab() {
  const listFn = useServerFn(adminListDrivers);
  const approveFn = useServerFn(adminApproveDriver);
  const suspendFn = useServerFn(adminSuspendDriver);
  const docsFn = useServerFn(adminDriverDocuments);
  const approveDocFn = useServerFn(adminApproveDocument);
  const revokeDocFn = useServerFn(adminRevokeDocument);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "suspended">("all");
  const [openDocsFor, setOpenDocsFor] = useState<string | null>(null);

  const { data: drivers } = useQuery({
    queryKey: ["admin-drivers", filter],
    queryFn: () => listFn({ data: { status: filter } }),
  });

  const approve = useMutation({
    mutationFn: (v: { driver_id: string; approved: boolean }) => approveFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast.success("Motorista atualizado");
    },
  });

  const suspend = useMutation({
    mutationFn: (v: { driver_id: string; suspended: boolean }) =>
      suspendFn({ data: { ...v, reason: v.suspended ? "Suspenso pelo admin" : undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast.success("Status atualizado");
    },
  });

  const { data: documents } = useQuery({
    queryKey: ["admin-driver-docs", openDocsFor],
    queryFn: () => docsFn({ data: { driver_id: openDocsFor! } }),
    enabled: !!openDocsFor,
  });

  const approveDoc = useMutation({
    mutationFn: (document_id: string) => approveDocFn({ data: { document_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-driver-docs"] });
      toast.success("Documento aprovado");
    },
  });

  const revokeDoc = useMutation({
    mutationFn: (document_id: string) => revokeDocFn({ data: { document_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-driver-docs"] });
      toast.success("Documento revogado");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "verified", "suspended"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s === "all"
              ? "Todos"
              : s === "pending"
                ? "Pendentes"
                : s === "verified"
                  ? "Aprovados"
                  : "Suspensos"}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNH</TableHead>
              <TableHead>Viagens</TableHead>
              <TableHead>★</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(drivers ?? []).map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.profile?.full_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{d.license_number}</TableCell>
                <TableCell>{d.total_trips}</TableCell>
                <TableCell>{Number(d.rating ?? 5).toFixed(2)}</TableCell>
                <TableCell>
                  {d.is_suspended ? (
                    <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
                      Suspenso
                    </span>
                  ) : d.is_verified ? (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      {d.is_online ? "Online" : "Aprovado"}
                    </span>
                  ) : (
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-secondary">
                      Pendente
                    </span>
                  )}
                </TableCell>
                <TableCell className="flex flex-wrap justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setOpenDocsFor(d.id)}>
                    <FileCheck className="size-3.5" /> Docs
                  </Button>
                  {!d.is_verified ? (
                    <Button
                      size="sm"
                      onClick={() => approve.mutate({ driver_id: d.id, approved: true })}
                    >
                      <CheckCircle2 className="size-3.5" /> Aprovar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approve.mutate({ driver_id: d.id, approved: false })}
                    >
                      <XCircle className="size-3.5" /> Reprovar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={d.is_suspended ? "default" : "destructive"}
                    onClick={() => suspend.mutate({ driver_id: d.id, suspended: !d.is_suspended })}
                  >
                    <ShieldOff className="size-3.5" />
                    {d.is_suspended ? "Reativar" : "Suspender"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!drivers?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum motorista
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {openDocsFor && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Documentos{" "}
              {(documents as any)?.profile?.full_name
                ? `· ${(documents as any).profile.full_name}`
                : ""}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setOpenDocsFor(null)}>
              Fechar
            </Button>
          </div>

          {(documents as any)?.vehicles?.length ? (
            <div className="mb-4 grid gap-2 md:grid-cols-2">
              {(documents as any).vehicles.map((v: any) => (
                <div key={v.id} className="rounded-lg border border-border p-3 text-xs">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Veículo
                  </p>
                  <p className="mt-0.5 font-semibold text-sm">
                    {v.brand} {v.model} {v.year ? `· ${v.year}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {v.type} · {v.color ?? "cor não informada"} · Placa{" "}
                    <span className="font-mono">{v.plate}</span> · {v.seats} lug.
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-2 md:grid-cols-2">
            {((documents as any)?.documents ?? []).map((doc: any) => (
              <div
                key={doc.id}
                className="flex gap-3 rounded-lg border border-border p-2.5 text-sm"
              >
                {doc.url ? (
                  /\.(pdf)$/i.test(doc.storage_path) ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground"
                    >
                      PDF
                    </a>
                  ) : (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="shrink-0">
                      <img
                        src={doc.url}
                        alt={doc.type}
                        className="size-16 rounded-md object-cover"
                      />
                    </a>
                  )
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-[10px] text-muted-foreground">
                    —
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold capitalize">{String(doc.type).replace("_", " ")}</p>
                  <p className="truncate text-xs text-muted-foreground">{doc.storage_path}</p>
                  <p className="mt-0.5 text-[11px] font-bold">
                    <span className={doc.verified ? "text-emerald-600" : "text-amber-600"}>
                      {doc.verified ? "Aprovado" : "Em análise"}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {doc.verified ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revokeDoc.isPending}
                      onClick={() => revokeDoc.mutate(doc.id)}
                    >
                      Revogar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={approveDoc.isPending}
                      onClick={() => approveDoc.mutate(doc.id)}
                    >
                      Aprovar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!((documents as any)?.documents ?? []).length && (
              <p className="text-sm text-muted-foreground">Sem documentos enviados.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ RIDES ============ */

function RidesTab() {
  const listFn = useServerFn(adminListRides);
  const [filter, setFilter] = useState<"all" | "live" | "completed" | "cancelled">("live");
  const { data: rides } = useQuery({
    queryKey: ["admin-rides", filter],
    queryFn: () => listFn({ data: { status: filter, limit: 200 } }),
    refetchInterval: filter === "live" ? 8000 : false,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["live", "completed", "cancelled", "all"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s === "live"
              ? "Em tempo real"
              : s === "completed"
                ? "Concluídas"
                : s === "cancelled"
                  ? "Canceladas"
                  : "Histórico"}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem → Destino</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Distância</TableHead>
              <TableHead>Tarifa</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rides ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[300px] truncate text-sm">
                  {r.origin_address} → {r.destination_address}
                </TableCell>
                <TableCell>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold">
                    {r.status}
                  </span>
                </TableCell>
                <TableCell>
                  {r.distance_km ? `${Number(r.distance_km).toFixed(1)} km` : "—"}
                </TableCell>
                <TableCell className="font-bold">
                  {BRL.format(Number(r.final_fare ?? r.estimated_fare ?? 0))}
                </TableCell>
                <TableCell className="text-xs">
                  {r.payment_method} · {r.payment_status}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.requested_at).toLocaleString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
            {!rides?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma corrida
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ============ FINANCE ============ */

function FinanceTab() {
  const fn = useServerFn(adminFinance);
  const feeFn = useServerFn(adminUpdatePlatformFee);
  const wdFn = useServerFn(adminProcessWithdrawal);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-finance"], queryFn: () => fn() });
  const [feeInput, setFeeInput] = useState<string>("");

  const updateFee = useMutation({
    mutationFn: (v: number) => feeFn({ data: { fee_percent: v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-finance"] });
      toast.success("Taxa atualizada");
    },
  });

  const processWd = useMutation({
    mutationFn: (v: { withdrawal_id: string; status: "approved" | "rejected" | "paid" }) =>
      wdFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-finance"] });
      toast.success("Saque atualizado");
    },
  });

  if (!data) return <SkeletonGrid />;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <KPI
          icon={<DollarSign className="size-4" />}
          label="Faturamento bruto (30d)"
          value={BRL.format(data.gross_30d)}
        />
        <KPI
          icon={<DollarSign className="size-4" />}
          label="Receita da plataforma (30d)"
          value={BRL.format(data.platform_revenue_30d)}
        />
        <KPI
          icon={<DollarSign className="size-4" />}
          label="Taxa atual"
          value={`${data.platform_fee_percent}%`}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Taxa da plataforma
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            step="0.5"
            placeholder={`${data.platform_fee_percent}`}
            value={feeInput}
            onChange={(e) => setFeeInput(e.target.value)}
            className="max-w-[140px]"
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button
            onClick={() => {
              const v = parseFloat(feeInput);
              if (!isNaN(v)) updateFee.mutate(v);
            }}
            disabled={!feeInput}
          >
            Salvar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Saques pendentes ({data.pending_withdrawals.length})
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motorista</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.pending_withdrawals.map((w: any) => (
              <TableRow key={w.id}>
                <TableCell className="font-mono text-xs">{w.driver_id.slice(0, 8)}</TableCell>
                <TableCell className="font-bold">{BRL.format(Number(w.amount))}</TableCell>
                <TableCell className="text-xs">
                  {new Date(w.created_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => processWd.mutate({ withdrawal_id: w.id, status: "paid" })}
                  >
                    Pagar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => processWd.mutate({ withdrawal_id: w.id, status: "rejected" })}
                  >
                    Rejeitar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!data.pending_withdrawals.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum saque pendente
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Transações recentes
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.transactions.slice(0, 30).map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">
                  {new Date(t.created_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="font-bold">{BRL.format(Number(t.amount))}</TableCell>
                <TableCell className="text-xs uppercase">{t.method}</TableCell>
                <TableCell>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                      t.status === "paid"
                        ? "bg-emerald-500/15 text-emerald-700"
                        : t.status === "pending"
                          ? "bg-primary/15 text-secondary"
                          : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {t.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {!data.transactions.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma transação nos últimos 30 dias
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ============ shared ============ */

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-lg bg-muted text-secondary">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xl font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
