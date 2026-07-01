import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { TriangleAlert, RotateCw } from "lucide-react";

class RouteErrorBoundary extends Component<{ children: ReactNode }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AuthedLayout]", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <TriangleAlert className="mx-auto size-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Erro ao carregar</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ocorreu um problema ao carregar esta página. Tente novamente.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => this.setState({ error: null })}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <RotateCw className="size-4" /> Tentar novamente
              </button>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground"
              >
                Ir para o login
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => (
    <RouteErrorBoundary>
      <AuthedLayout />
    </RouteErrorBoundary>
  ),
});

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDriver = pathname.startsWith("/driver");
  return (
    <div className={`min-h-screen bg-background ${isDriver ? "" : "pb-20"}`}>
      <Outlet />
      {!isDriver && <BottomNav />}
    </div>
  );
}
