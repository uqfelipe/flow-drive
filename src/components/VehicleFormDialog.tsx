import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicles";
import { toast } from "@/hooks/use-toast";
import type { Vehicle } from "@/types";

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

export function VehicleFormDialog({ open, onOpenChange, vehicle }: Props) {
  const isEdit = !!vehicle;
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const [form, setForm] = useState({
    name: "", brand: "", model: "", year: new Date().getFullYear(),
    plate: "", color: "", category: "sedan" as string, status: "available" as string,
    daily_rate: 0, weekly_rate: 0, monthly_rate: 0, description: "",
  });

  useEffect(() => {
    if (vehicle) {
      setForm({
        name: vehicle.name, brand: vehicle.brand, model: vehicle.model,
        year: vehicle.year, plate: vehicle.plate, color: vehicle.color ?? "",
        category: vehicle.category, status: vehicle.status,
        daily_rate: Number(vehicle.daily_rate), weekly_rate: Number(vehicle.weekly_rate),
        monthly_rate: Number(vehicle.monthly_rate), description: vehicle.description ?? "",
      });
    } else {
      setForm({
        name: "", brand: "", model: "", year: new Date().getFullYear(),
        plate: "", color: "", category: "sedan", status: "available",
        daily_rate: 0, weekly_rate: 0, monthly_rate: 0, description: "",
      });
    }
  }, [vehicle, open]);

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.brand || !form.model || !form.plate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      if (isEdit && vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, ...form } as any);
        toast({ title: "Veículo atualizado com sucesso" });
      } else {
        await createMutation.mutateAsync(form as any);
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
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Veículo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
