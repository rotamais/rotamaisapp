import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDriverDocumentUrls, registerDriverDocument } from "@/lib/driver.functions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, FileUp, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type DocType =
  | "identity"
  | "cnh"
  | "crlv"
  | "vehicle_photo"
  | "insurance"
  | "vehicle_other";

const DOCS: { type: DocType; title: string; subtitle: string; required: boolean }[] = [
  { type: "identity", title: "Documento de identidade", subtitle: "RG ou CPF (frente e verso)", required: true },
  { type: "cnh", title: "CNH", subtitle: "Habilitação válida (frente e verso)", required: true },
  { type: "crlv", title: "CRLV do veículo", subtitle: "Documento atualizado do carro", required: true },
  { type: "vehicle_photo", title: "Foto do veículo", subtitle: "Frente do veículo com a placa visível", required: true },
  { type: "insurance", title: "Seguro do veículo", subtitle: "Apólice vigente (opcional)", required: false },
  { type: "vehicle_other", title: "Outros documentos do carro", subtitle: "Laudo, vistoria, autorização etc.", required: false },
];

export function DriverDocumentsManager({
  userId,
  documents,
  vehicleId,
  onChanged,
}: {
  userId: string;
  documents: { id: string; type: string; storage_path: string; verified: boolean }[];
  vehicleId?: string;
  onChanged: () => void;
}) {
  const registerFn = useServerFn(registerDriverDocument);
  const urlsFn = useServerFn(getDriverDocumentUrls);
  const [busy, setBusy] = useState<string | null>(null);

  const paths = useMemo(() => documents.map((d) => d.storage_path), [documents]);
  const { data: urlMap } = useQuery({
    queryKey: ["driver-doc-urls", paths.join("|")],
    queryFn: () => urlsFn({ data: { paths } }),
    enabled: paths.length > 0,
    staleTime: 60 * 1000 * 20,
  });

  const byType = useMemo(() => {
    const m = new Map<string, typeof documents[number]>();
    // mais recentes primeiro — assumir ordem de chegada da query
    documents.forEach((d) => {
      if (!m.has(d.type)) m.set(d.type, d);
    });
    return m;
  }, [documents]);

  async function upload(type: DocType, file: File) {
    setBusy(type);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${type}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      await registerFn({
        data: { type, storage_path: path, vehicle_id: vehicleId, replace: true },
      });
      toast.success("Documento enviado");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no envio");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-extrabold">Meus documentos</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Envie fotos legíveis. Cada novo envio substitui o anterior e volta para análise.
        </p>
      </div>

      {DOCS.map((d) => {
        const existing = byType.get(d.type);
        const url = existing ? urlMap?.[existing.storage_path] : undefined;
        const status = existing
          ? existing.verified
            ? { label: "Aprovado", icon: <CheckCircle2 className="size-3.5" />, cls: "bg-emerald-500/15 text-emerald-700" }
            : { label: "Em análise", icon: <Clock className="size-3.5" />, cls: "bg-amber-500/15 text-amber-700" }
          : { label: d.required ? "Obrigatório" : "Opcional", icon: <FileUp className="size-3.5" />, cls: "bg-muted text-muted-foreground" };
        const isBusy = busy === d.type;
        return (
          <div key={d.type} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              {existing && url ? (
                /\.(pdf)$/i.test(existing.storage_path) ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-16 shrink-0 place-items-center rounded-xl bg-muted text-[11px] font-bold text-muted-foreground"
                  >
                    PDF
                  </a>
                ) : (
                  <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={url} alt={d.title} className="size-16 rounded-xl object-cover" />
                  </a>
                )
              ) : (
                <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <FileUp className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{d.title}</p>
                <p className="text-[11px] text-muted-foreground">{d.subtitle}</p>
                <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>
                  {status.icon}
                  {status.label}
                </span>
              </div>
            </div>

            <label className="mt-3 block">
              <Button
                asChild
                variant={existing ? "outline" : "default"}
                className="h-10 w-full text-xs font-bold"
                disabled={isBusy}
              >
                <span>
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : existing ? (
                    <>
                      <RefreshCw className="size-4" /> Substituir documento
                    </>
                  ) : (
                    <>
                      <FileUp className="size-4" /> Enviar agora
                    </>
                  )}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={isBusy}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(d.type, f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
