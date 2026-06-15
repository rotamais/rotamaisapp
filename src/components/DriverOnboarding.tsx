import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { submitDriverOnboarding, registerDriverDocument } from "@/lib/driver.functions";
import { Loader2, FileUp, Check } from "lucide-react";
import { toast } from "sonner";

type DocType = "cnh" | "crlv" | "vehicle_photo";

const DOC_LABELS: Record<DocType, string> = {
  cnh: "CNH (frente e verso em uma foto)",
  crlv: "CRLV do veículo",
  vehicle_photo: "Foto do veículo",
};

export function DriverOnboarding({
  userId,
  initialDocuments,
  onDone,
}: {
  userId: string;
  initialDocuments: { type: string }[];
  onDone: () => void;
}) {
  const submitFn = useServerFn(submitDriverOnboarding);
  const registerDocFn = useServerFn(registerDriverDocument);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialDocuments.map((d) => [d.type, true])),
  );

  // CNH
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("B");
  const [licenseExpires, setLicenseExpires] = useState("");
  // Veículo
  const [type, setType] = useState<"car" | "motorcycle" | "van">("car");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");

  async function handleStep2() {
    const cleanPlate = plate.replace(/[\s-]/g, "").toUpperCase();
    if (licenseNumber.trim().length < 3) {
      toast.error("CNH inválida (mínimo 3 caracteres)");
      setStep(1);
      return;
    }
    if (cleanPlate.length < 5) {
      toast.error("Placa inválida");
      return;
    }
    setLoading(true);
    try {
      const res = await submitFn({
        data: {
          license_number: licenseNumber.trim(),
          license_category: licenseCategory,
          license_expires_at: licenseExpires || undefined,
          vehicle: {
            type,
            brand: brand.trim(),
            model: model.trim(),
            year: year ? Number(year) : undefined,
            color: color || undefined,
            plate: cleanPlate,
            seats: type === "motorcycle" ? 2 : 4,
          },
        },
      });
      setVehicleId(res.vehicle_id);
      setStep(3);
    } catch (e: any) {
      const msg =
        e?.message ??
        e?.error?.message ??
        (typeof e === "string" ? e : JSON.stringify(e));
      console.error("[onboarding] submit error", e);
      toast.error(`Erro ao salvar: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(docType: DocType, file: File) {
    setLoading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      await registerDocFn({
        data: { type: docType, storage_path: path, vehicle_id: vehicleId ?? undefined },
      });
      setUploaded((u) => ({ ...u, [docType]: true }));
      toast.success("Enviado!");
    } catch (e: any) {
      const msg =
        e?.message ??
        e?.error?.message ??
        (typeof e === "string" ? e : JSON.stringify(e));
      console.error("[onboarding] upload error", e);
      toast.error(`Erro no upload: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const allUploaded = uploaded.cnh && uploaded.crlv && uploaded.vehicle_photo;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold">Dados da CNH</h2>
          <div>
            <Label htmlFor="cnh">Número da CNH</Label>
            <Input id="cnh" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cat">Categoria</Label>
              <select
                id="cat"
                value={licenseCategory}
                onChange={(e) => setLicenseCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {["A", "B", "AB", "C", "D", "E"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="exp">Validade</Label>
              <Input
                id="exp"
                type="date"
                value={licenseExpires}
                onChange={(e) => setLicenseExpires(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="h-11 w-full text-sm font-bold"
            disabled={licenseNumber.trim().length < 3 || !licenseCategory}
            onClick={() => setStep(2)}
          >
            Continuar
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold">Veículo</h2>
          <div>
            <Label htmlFor="vtype">Tipo</Label>
            <select
              id="vtype"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="car">Carro</option>
              <option value="motorcycle">Moto</option>
              <option value="van">Van</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="color">Cor</Label>
              <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="ABC1D23"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-11 flex-1" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button
              className="h-11 flex-1 text-sm font-bold"
              disabled={loading || !brand.trim() || !model.trim() || plate.replace(/[\s-]/g, "").length < 5}
              onClick={handleStep2}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Continuar"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold">Documentos</h2>
          <p className="text-xs text-muted-foreground">
            Envie fotos legíveis. Após análise pelo time RotaMais, você poderá ficar online.
          </p>
          {(Object.keys(DOC_LABELS) as DocType[]).map((t) => (
            <DocUpload
              key={t}
              label={DOC_LABELS[t]}
              uploaded={!!uploaded[t]}
              disabled={loading}
              onPick={(f) => handleUpload(t, f)}
            />
          ))}
          <Button
            className="h-11 w-full text-sm font-bold"
            disabled={!allUploaded || loading}
            onClick={onDone}
          >
            Concluir e aguardar aprovação
          </Button>
        </div>
      )}
    </div>
  );
}

function DocUpload({
  label,
  uploaded,
  disabled,
  onPick,
}: {
  label: string;
  uploaded: boolean;
  disabled?: boolean;
  onPick: (f: File) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${uploaded ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-muted"}`}
    >
      {uploaded ? (
        <Check className="size-5 text-emerald-500" />
      ) : (
        <FileUp className="size-5 text-muted-foreground" />
      )}
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <span className="text-[11px] text-muted-foreground">
        {uploaded ? "Enviado" : "Selecionar"}
      </span>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
    </label>
  );
}
