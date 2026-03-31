import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicles";
import { toast } from "@/hooks/use-toast";
import { ImagePlus, X, Loader2 } from "lucide-react";
import type { Vehicle } from "@/types";

const IMGBB_API_KEY = "218e4f96aa83bbfd4e78abb8d60bad52";

const categories = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "hatch", label: "Hatch" },
  { value: "pickup", label: "Pickup" },
  { value: "van", label: "Van" },
  { value: "luxury", label: "Luxo" },
  { value: "economy", label: "Econômico" },
];

const statuses = [
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservado" },
  { value: "rented", label: "Alugado" },
  { value: "maintenance", label: "Manutenção" },
  { value: "inactive", label: "Inativo" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle | null;
}

async function uploadToImgbb(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Falha ao fazer upload da imagem");
  const json = await res.json();
  return json.data.url;
}

export function VehicleFormDialog({ open, onOpenChange, vehicle }: Props) {
  const isEdit = !!vehicle;
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "", brand: "", model: "", year: new Date().getFullYear(),
    plate: "", color: "", category: "sedan" as string, status: "available" as string,
    daily_rate: 0, weekly_rate: 0, monthly_rate: 0, description: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Ctrl+V paste support
  useEffect(() => {
    if (!open) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length === 0) return;
      e.preventDefault();
      setUploading(true);
      try {
        const urls = await Promise.all(imageFiles.map(uploadToImgbb));
        setImages((prev) => [...prev, ...urls]);
        toast({ title: `${urls.length} imagem(ns) colada(s)` });
      } catch (err: any) {
        toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [open]);

  useEffect(() => {
    if (vehicle) {
      setForm({
        name: vehicle.name, brand: vehicle.brand, model: vehicle.model,
        year: vehicle.year, plate: vehicle.plate, color: vehicle.color ?? "",
        category: vehicle.category, status: vehicle.status,
        daily_rate: Number(vehicle.daily_rate), weekly_rate: Number(vehicle.weekly_rate),
        monthly_rate: Number(vehicle.monthly_rate), description: vehicle.description ?? "",
      });
      setImages(vehicle.images ?? []);
    } else {
      setForm({
        name: "", brand: "", model: "", year: new Date().getFullYear(),
        plate: "", color: "", category: "sedan", status: "available",
        daily_rate: 0, weekly_rate: 0, monthly_rate: 0, description: "",
      });
      setImages([]);
    }
  }, [vehicle, open]);

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) => uploadToImgbb(file));
      const urls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...urls]);
      toast({ title: `${urls.length} imagem(ns) enviada(s)` });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.brand || !form.model || !form.plate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      const payload = { ...form, images };
      if (isEdit && vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, ...payload } as any);
        toast({ title: "Veículo atualizado com sucesso" });
      } else {
        await createMutation.mutateAsync(payload as any);
        toast({ title: "Veículo criado com sucesso" });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar veículo", description: e.message, variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Images section */}
          <div className="col-span-2 space-y-2">
            <Label>Fotos do Veículo</Label>
            <div className="flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px]">Adicionar</span>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Onix Plus" />
          </div>
          <div className="space-y-2">
            <Label>Marca *</Label>
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ex: Chevrolet" />
          </div>
          <div className="space-y-2">
            <Label>Modelo *</Label>
            <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Ex: Onix Plus LTZ" />
          </div>
          <div className="space-y-2">
            <Label>Ano *</Label>
            <Input type="number" value={form.year} onChange={(e) => set("year", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Placa *</Label>
            <Input value={form.plate} onChange={(e) => set("plate", e.target.value.toUpperCase())} placeholder="ABC1D23" />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Ex: Branco" />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Diária (R$)</Label>
            <Input type="number" min={0} value={form.daily_rate} onChange={(e) => set("daily_rate", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Semanal (R$)</Label>
            <Input type="number" min={0} value={form.weekly_rate} onChange={(e) => set("weekly_rate", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Mensal (R$)</Label>
            <Input type="number" min={0} value={form.monthly_rate} onChange={(e) => set("monthly_rate", Number(e.target.value))} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Observações sobre o veículo..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending || uploading}>
            {isPending ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Veículo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
