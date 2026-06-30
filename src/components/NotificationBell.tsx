import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@/lib/notifications.functions";

function RelativeTime({ date }: { date: string }) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const countFn = useServerFn(getUnreadCount);
  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationRead);

  const { data: unread } = useQuery({
    queryKey: ["notification-count"],
    queryFn: () => countFn(),
    refetchInterval: 30000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listFn(),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: () => markFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-count"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative grid size-10 place-items-center rounded-full bg-background shadow-[var(--shadow-soft)]">
          <Bell className="size-5" />
          {(unread ?? 0) > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold">Notificações</h3>
          {(unread ?? 0) > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => markRead.mutate()}
            >
              {markRead.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              Marcar lidas
            </Button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {!notifications?.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          ) : (
            notifications.map((n: any) => (
              <div
                key={n.id}
                className={`border-b border-border px-4 py-3 text-sm transition ${
                  !n.read_at ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{n.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    <RelativeTime date={n.created_at} />
                  </span>
                </div>
                {n.body && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
