import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  FileCheck,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  ShieldOff,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
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
  adminReports,
  adminListTickets,
  adminUpdateTicket,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Section =
  | "dashboard"
  | "users"
  | "drivers"
  | "rides"
  | "payments"
  | "reports"
  | "support"
  | "settings";

const sidebarItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Usuários", icon: Users },
  { id: "drivers", label: "Motoristas", icon: Car },
  { id: "rides", label: "Corridas", icon: Activity },
  { id: "payments", label: "Pagamentos", icon: CreditCard },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "support", label: "Suporte", icon: HelpCircle },
  { id: "settings", label: "Configurações", icon: Settings },
];

function AdminPanel() {
  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0 -translate-x-full lg:w-16 lg:translate-x-0"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-secondary">
                <span className="text-sm font-extrabold text-primary">R+</span>
              </div>
              <span className="text-base font-extrabold">RotaMais</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex"
          >
            {sidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  section === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="size-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-5 shrink-0" />
            {sidebarOpen && <span>Sair do painel</span>}
          </button>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="size-5" />
            </Button>
            <h2 className="text-lg font-extrabold">{sidebarItems.find((s) => s.id === section)?.label}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Ao vivo
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {section === "dashboard" && <DashboardSection />}
          {section === "users" && <UsersSection />}
          {section === "drivers" && <DriversSection />}
          {section === "rides" && <RidesSection />}
          {section === "payments" && <PaymentsSection />}
          {section === "reports" && <ReportsSection />}
          {section === "support" && <SupportSection />}
          {section === "settings" && <SettingsSection />}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function DashboardSection() {
  const dashFn = useServerFn(adminDashboard);
  const rptFn = useServerFn(adminReports);
  const ridesFn = useServerFn(adminListRides);

  const { data: dash } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => dashFn(),
    refetchInterval: 15000,
  });

  const { data: rpt } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => rptFn(),
  });

  const { data: recentRides } = useQuery({
    queryKey: ["admin-recent-rides"],
    queryFn: () => ridesFn({ data: { status: "all", limit: 10 } }),
  });

  if (!dash || !rpt) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  const totalRides = dash.rides_completed_today + dash.rides_in_progress;
  const chartData = rpt.rides_by_day.slice(-14);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="size-5" />}
          label="Usuários ativos"
          value={dash.total_users.toLocaleString("pt-BR")}
          trend="+12%"
          positive
        />
        <KpiCard
          icon={<Car className="size-5" />}
          label="Motoristas online"
          value={dash.drivers_online.toString()}
          trend={dash.drivers_online > 0 ? "+3" : "0"}
          positive={dash.drivers_online > 0}
        />
        <KpiCard
          icon={<Activity className="size-5" />}
          label="Corridas realizadas"
          value={totalRides.toString()}
          sub="hoje"
        />
        <KpiCard
          icon={<DollarSign className="size-5" />}
          label="Faturamento"
          value={BRL.format(dash.revenue_today)}
          sub="hoje"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rides per period */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Corridas por período</h3>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString("pt-BR")}
                />
                <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Receita (14 dias)</h3>
            <DollarSign className="size-4 text-muted-foreground" />
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rpt.revenue_by_day.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `R$${v}`} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString("pt-BR")}
                  formatter={(v: number) => [BRL.format(v), "Receita"]}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment methods pie */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Métodos de pagamento</h3>
            <CreditCard className="size-4 text-muted-foreground" />
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rpt.payment_methods.length ? rpt.payment_methods : [{ name: "card", value: 1 }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  label={({ name, percent }: any) =>
                    `${name === "card" ? "Cartão" : name === "pix" ? "Pix" : name === "cash" ? "Dinheiro" : name === "wallet" ? "Carteira" : name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {rpt.payment_methods.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent rides table */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-bold">Corridas recentes</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <Download className="size-3.5" /> Exportar
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSection("rides")}>
              Ver todas
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem → Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Distância</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentRides ?? []).slice(0, 8).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[240px] truncate text-sm">
                    {r.origin_address} → {r.destination_address}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.distance_km ? `${Number(r.distance_km).toFixed(1)} km` : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {BRL.format(Number(r.final_fare ?? r.estimated_fare ?? 0))}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.payment_method === "card" ? "Cartão" : r.payment_method === "pix" ? "Pix" : r.payment_method === "cash" ? "Dinheiro" : r.payment_method}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.requested_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {!recentRides?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma corrida registrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    requested: { label: "Solicitada", class: "bg-primary/15 text-primary" },
    accepted: { label: "Aceita", class: "bg-blue-500/15 text-blue-600" },
    driver_arrived: { label: "Chegou", class: "bg-blue-500/15 text-blue-600" },
    in_progress: { label: "Em andamento", class: "bg-amber-500/15 text-amber-600" },
    completed: { label: "Concluída", class: "bg-emerald-500/15 text-emerald-600" },
    cancelled: { label: "Cancelada", class: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] ?? { label: status, class: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${m.class}`}>
      {m.label}
    </span>
  );
}

function KpiCard({
  icon,
  label,
  value,
  trend,
  sub,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary/30 text-secondary">
          {icon}
        </span>
        {trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              positive ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">
        {label}
        {sub && <span className="ml-1 text-[11px]">· {sub}</span>}
      </p>
    </div>
  );
}

/* ============================================================
   USERS
   ============================================================ */

function UsersSection() {
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{users?.length ?? 0} usuários</span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Corridas</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.phone ?? "—"}</TableCell>
                <TableCell>{u.total_rides}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    {Number(u.rating ?? 5).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  {u.is_blocked ? (
                    <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">Bloqueado</span>
                  ) : (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600">Ativo</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
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
                  </div>
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
            <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>Fechar</Button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(history ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.origin_address} → {r.destination_address}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")} · <StatusBadge status={r.status} />
                  </p>
                </div>
                <span className="font-bold shrink-0 ml-2">{BRL.format(Number(r.final_fare ?? r.estimated_fare ?? 0))}</span>
              </div>
            ))}
            {!history?.length && <p className="text-sm text-muted-foreground">Sem corridas.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DRIVERS
   ============================================================ */

function DriversSection() {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-drivers"] }); toast.success("Motorista atualizado"); },
  });

  const suspend = useMutation({
    mutationFn: (v: { driver_id: string; suspended: boolean }) =>
      suspendFn({ data: { ...v, reason: v.suspended ? "Suspenso pelo admin" : undefined } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-drivers"] }); toast.success("Status atualizado"); },
  });

  const { data: documents } = useQuery({
    queryKey: ["admin-driver-docs", openDocsFor],
    queryFn: () => docsFn({ data: { driver_id: openDocsFor! } }),
    enabled: !!openDocsFor,
  });

  const approveDoc = useMutation({
    mutationFn: (document_id: string) => approveDocFn({ data: { document_id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-driver-docs"] }); toast.success("Documento aprovado"); },
  });

  const revokeDoc = useMutation({
    mutationFn: (document_id: string) => revokeDocFn({ data: { document_id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-driver-docs"] }); toast.success("Documento revogado"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "verified", "suspended"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : s === "verified" ? "Aprovados" : "Suspensos"}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground self-center">{drivers?.length ?? 0} motoristas</span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNH</TableHead>
              <TableHead>Viagens</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(drivers ?? []).map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.profile?.full_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{d.license_number || "—"}</TableCell>
                <TableCell>{d.total_trips}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    {Number(d.rating ?? 5).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  {d.is_suspended ? (
                    <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">Suspenso</span>
                  ) : d.is_verified ? (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600">
                      {d.is_online ? "Online" : "Aprovado"}
                    </span>
                  ) : (
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">Pendente</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setOpenDocsFor(d.id)}>
                      <FileCheck className="size-3.5" /> Docs
                    </Button>
                    {!d.is_verified ? (
                      <Button size="sm" onClick={() => approve.mutate({ driver_id: d.id, approved: true })}>
                        <CheckCircle2 className="size-3.5" /> Aprovar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => approve.mutate({ driver_id: d.id, approved: false })}>
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!drivers?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhum motorista</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {openDocsFor && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Documentos {(documents as any)?.profile?.full_name ? `· ${(documents as any).profile.full_name}` : ""}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setOpenDocsFor(null)}>Fechar</Button>
          </div>
          {(documents as any)?.vehicles?.length ? (
            <div className="mb-4 grid gap-2 md:grid-cols-2">
              {(documents as any).vehicles.map((v: any) => (
                <div key={v.id} className="rounded-lg border border-border p-3 text-xs">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Veículo</p>
                  <p className="mt-0.5 font-semibold text-sm">{v.brand} {v.model} {v.year ? `· ${v.year}` : ""}</p>
                  <p className="text-muted-foreground">{v.type} · {v.color ?? "cor não informada"} · Placa <span className="font-mono">{v.plate}</span> · {v.seats} lug.</p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-2">
            {((documents as any)?.documents ?? []).map((doc: any) => (
              <div key={doc.id} className="flex gap-3 rounded-lg border border-border p-2.5 text-sm">
                {doc.url ? (
                  /\.(pdf)$/i.test(doc.storage_path) ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">PDF</a>
                  ) : (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={doc.url} alt={doc.type} className="size-16 rounded-md object-cover" />
                    </a>
                  )
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-[10px] text-muted-foreground">—</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold capitalize">{String(doc.type).replace("_", " ")}</p>
                  <p className="truncate text-xs text-muted-foreground">{doc.storage_path}</p>
                  <p className="mt-0.5 text-[11px] font-bold">
                    <span className={doc.verified ? "text-emerald-600" : "text-amber-600"}>{doc.verified ? "Aprovado" : "Em análise"}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {doc.verified ? (
                    <Button size="sm" variant="outline" disabled={revokeDoc.isPending} onClick={() => revokeDoc.mutate(doc.id)}>Revogar</Button>
                  ) : (
                    <Button size="sm" disabled={approveDoc.isPending} onClick={() => approveDoc.mutate(doc.id)}>Aprovar</Button>
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

/* ============================================================
   RIDES
   ============================================================ */

function RidesSection() {
  const listFn = useServerFn(adminListRides);
  const [filter, setFilter] = useState<"all" | "live" | "completed" | "cancelled">("live");
  const { data: rides } = useQuery({
    queryKey: ["admin-rides", filter],
    queryFn: () => listFn({ data: { status: filter, limit: 200 } }),
    refetchInterval: filter === "live" ? 8000 : false,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["live", "completed", "cancelled", "all"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "live" ? "Em tempo real" : s === "completed" ? "Concluídas" : s === "cancelled" ? "Canceladas" : "Histórico"}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{rides?.length ?? 0} corridas</span>
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
                <TableCell className="max-w-[300px] truncate text-sm">{r.origin_address} → {r.destination_address}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.distance_km ? `${Number(r.distance_km).toFixed(1)} km` : "—"}</TableCell>
                <TableCell className="font-semibold">{BRL.format(Number(r.final_fare ?? r.estimated_fare ?? 0))}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.payment_method === "card" ? "Cartão" : r.payment_method === "pix" ? "Pix" : r.payment_method} · {r.payment_status}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.requested_at).toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
            {!rides?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhuma corrida</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ============================================================
   PAYMENTS
   ============================================================ */

function PaymentsSection() {
  const fn = useServerFn(adminFinance);
  const wdFn = useServerFn(adminProcessWithdrawal);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-finance"], queryFn: () => fn() });

  const processWd = useMutation({
    mutationFn: (v: { withdrawal_id: string; status: "approved" | "rejected" | "paid" }) =>
      wdFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-finance"] }); toast.success("Saque atualizado"); },
  });

  if (!data) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={<DollarSign className="size-5" />} label="Faturamento bruto (30d)" value={BRL.format(data.gross_30d)} />
        <KpiCard icon={<TrendingUp className="size-5" />} label="Receita da plataforma (30d)" value={BRL.format(data.platform_revenue_30d)} />
        <KpiCard icon={<FileText className="size-5" />} label="Taxa atual" value={`${data.platform_fee_percent}%`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
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
                  <TableCell className="text-xs">{new Date(w.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => processWd.mutate({ withdrawal_id: w.id, status: "paid" })}>Pagar</Button>
                      <Button size="sm" variant="destructive" onClick={() => processWd.mutate({ withdrawal_id: w.id, status: "rejected" })}>Rejeitar</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!data.pending_withdrawals.length && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Nenhum saque pendente</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Transações recentes</h3>
          <div className="max-h-[320px] overflow-y-auto">
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
                    <TableCell className="text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-bold">{BRL.format(Number(t.amount))}</TableCell>
                    <TableCell className="text-xs uppercase">{t.method === "card" ? "Cartão" : t.method === "pix" ? "Pix" : t.method}</TableCell>
                    <TableCell>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        t.status === "paid" ? "bg-emerald-500/15 text-emerald-600" :
                        t.status === "pending" ? "bg-primary/15 text-primary" :
                        "bg-destructive/15 text-destructive"
                      }`}>{t.status === "paid" ? "Pago" : t.status === "pending" ? "Pendente" : t.status === "failed" ? "Falhou" : t.status === "refunded" ? "Reembolsado" : t.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {!data.transactions.length && (
                  <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Nenhuma transação</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   REPORTS
   ============================================================ */

function ReportsSection() {
  const rptFn = useServerFn(adminReports);
  const { data } = useQuery({ queryKey: ["admin-reports"], queryFn: () => rptFn() });

  if (!data) {
    return <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={<Activity className="size-5" />} label="Corridas concluídas (30d)" value={data.total_completed_30d.toString()} />
        <KpiCard icon={<XCircle className="size-5" />} label="Canceladas (30d)" value={data.total_cancelled_30d.toString()} />
        <KpiCard
          icon={<BarChart3 className="size-5" />}
          label="Taxa de conclusão"
          value={data.total_completed_30d + data.total_cancelled_30d > 0
            ? `${((data.total_completed_30d / (data.total_completed_30d + data.total_cancelled_30d)) * 100).toFixed(1)}%`
            : "—"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rides per day - full 30 days */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-bold">Corridas por dia (30 dias)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.rides_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString("pt-BR")}
                />
                <Bar dataKey="completed" name="Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="cancelled" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue per day */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-bold">Receita por dia (30 dias)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenue_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString("pt-BR")}
                  formatter={(v: number) => [BRL.format(v), "Receita"]}
                />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment methods & status */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-bold">Métodos de pagamento</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.payment_methods.length ? data.payment_methods : [{ name: "card", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data.payment_methods.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-bold">Status dos pagamentos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.payment_status.length ? data.payment_status : [{ name: "pending", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data.payment_status.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SUPPORT
   ============================================================ */

const ticketStatusConfig: Record<string, { label: string; class: string }> = {
  open: { label: "Aberto", class: "bg-amber-500/15 text-amber-600" },
  in_progress: { label: "Em andamento", class: "bg-blue-500/15 text-blue-600" },
  resolved: { label: "Resolvido", class: "bg-emerald-500/15 text-emerald-600" },
  closed: { label: "Fechado", class: "bg-muted text-muted-foreground" },
};

const ticketPriorityConfig: Record<string, { label: string; class: string }> = {
  low: { label: "Baixa", class: "bg-muted text-muted-foreground" },
  medium: { label: "Média", class: "bg-primary/15 text-primary" },
  high: { label: "Alta", class: "bg-orange-500/15 text-orange-600" },
  urgent: { label: "Urgente", class: "bg-destructive/15 text-destructive" },
};

function SupportSection() {
  const listFn = useServerFn(adminListTickets);
  const updateFn = useServerFn(adminUpdateTicket);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tickets } = useQuery({
    queryKey: ["admin-tickets", statusFilter],
    queryFn: () => listFn({ data: { status: statusFilter as any } }),
    refetchInterval: 15000,
  });

  const updateTicket = useMutation({
    mutationFn: (v: { ticket_id: string; status?: string; priority?: string; assigned_to?: string | null }) =>
      updateFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Ticket atualizado");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Tickets ({tickets?.length ?? 0})
        </h3>
        <div className="flex gap-2">
          {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="text-xs"
            >
              {s === "all" ? "Todos" : ticketStatusConfig[s]?.label ?? s}
            </Button>
          ))}
        </div>
      </div>

      {!tickets ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <HelpCircle className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-bold">Nenhum ticket</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum ticket de suporte {statusFilter !== "all" ? `com status "${ticketStatusConfig[statusFilter]?.label}"` : "encontrado"}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => (
            <div key={ticket.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{ticket.subject}</p>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${ticketStatusConfig[ticket.status]?.class}`}>
                      {ticketStatusConfig[ticket.status]?.label ?? ticket.status}
                    </span>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${ticketPriorityConfig[ticket.priority]?.class}`}>
                      {ticketPriorityConfig[ticket.priority]?.label ?? ticket.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ticket.message}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Usuário: {ticket.user?.full_name ?? ticket.user_id.slice(0, 8)}</span>
                    <span>{new Date(ticket.created_at).toLocaleString("pt-BR")}</span>
                    {ticket.category && <span>Categoria: {ticket.category}</span>}
                    {ticket.resolved_at && <span>Resolvido em: {new Date(ticket.resolved_at).toLocaleString("pt-BR")}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <select
                    value={ticket.status}
                    onChange={(e) => updateTicket.mutate({ ticket_id: ticket.id, status: e.target.value })}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {Object.entries(ticketStatusConfig).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <select
                    value={ticket.priority}
                    onChange={(e) => updateTicket.mutate({ ticket_id: ticket.id, priority: e.target.value })}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {Object.entries(ticketPriorityConfig).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SETTINGS
   ============================================================ */

function SettingsSection() {
  const feeFn = useServerFn(adminUpdatePlatformFee);
  const fn = useServerFn(adminFinance);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-finance"], queryFn: () => fn() });
  const [feeInput, setFeeInput] = useState("");

  const updateFee = useMutation({
    mutationFn: (v: number) => feeFn({ data: { fee_percent: v } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-finance"] }); toast.success("Taxa atualizada"); },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Taxa da plataforma</h3>
        <p className="mt-1 text-xs text-muted-foreground">Porcentagem retida sobre cada corrida concluída</p>
        <div className="mt-4 flex items-center gap-2">
          <Input
            type="number"
            step="0.5"
            placeholder={data?.platform_fee_percent?.toString() ?? "20"}
            value={feeInput}
            onChange={(e) => setFeeInput(e.target.value)}
            className="max-w-[140px]"
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button onClick={() => { const v = parseFloat(feeInput); if (!isNaN(v)) updateFee.mutate(v); }} disabled={!feeInput}>
            Salvar
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Informações do sistema</h3>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Versão</span><span className="font-semibold">1.0.0</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ambiente</span><span className="font-semibold">Produção</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Supabase</span><span className="font-semibold">Conectado</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Storage</span><span className="font-semibold">3 buckets</span></div>
        </div>
      </div>
    </div>
  );
}
