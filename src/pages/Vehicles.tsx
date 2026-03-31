import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Car, Filter, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useVehicles } from "@/hooks/use-vehicles";
import { VehicleFormDialog } from "@/components/VehicleFormDialog";
import { VehicleDeleteDialog } from "@/components/VehicleDeleteDialog";
import type { Vehicle, VehicleStatus } from "@/types";

const statusConfig: Record<VehicleStatus, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-success/10 text-success border-success/30" },
  reserved: { label: "Reservado", className: "bg-warning/10 text-warning border-warning/30" },
  rented: { label: "Alugado", className: "bg-primary/10 text-primary border-primary/30" },
  maintenance: { label: "Manutenção", className: "bg-muted text-muted-foreground border-border" },
  inactive: { label: "Inativo", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservado" },
  { value: "rented", label: "Alugado" },
  { value: "maintenance", label: "Manutenção" },
  { value: "inactive", label: "Inativo" },
];

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const { data: vehicles, isLoading } = useVehicles();

  const filtered = (vehicles ?? []).filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditVehicle(null); setFormOpen(true); };
  const openEdit = (v: Vehicle) => { setEditVehicle(v); setFormOpen(true); };

  return (
    <AdminLayout title="Veículos" subtitle="Gerencie sua frota">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar veículo, marca ou placa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  {statusFilter === "all" ? "Filtrar" : statusOptions.find((s) => s.value === statusFilter)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {statusOptions.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => setStatusFilter(s.value)}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="shadow-glow-sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Novo Veículo
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="p-0"><Skeleton className="h-40 w-full" /><div className="p-4"><Skeleton className="h-16 w-full" /></div></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Car className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum veículo encontrado</p>
            <p className="text-sm">Adicione um veículo clicando em "Novo Veículo"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vehicle) => (
              <Card key={vehicle.id} className="card-hover-lift border-border/60 overflow-hidden group relative">
                <CardContent className="p-0">
                  <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => openEdit(vehicle)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setDeleteTarget(vehicle)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="h-40 bg-muted/50 flex items-center justify-center cursor-pointer overflow-hidden" onClick={() => openEdit(vehicle)}>
                    {vehicle.images && vehicle.images.length > 0 ? (
                      <img src={vehicle.images[0]} alt={vehicle.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <Car className="h-12 w-12 text-muted-foreground/20 group-hover:text-primary/30 transition-colors duration-300" />
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-sm">{vehicle.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{vehicle.brand} • {vehicle.year} • {vehicle.plate}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${statusConfig[vehicle.status as VehicleStatus]?.className ?? ""}`}>
                        {statusConfig[vehicle.status as VehicleStatus]?.label ?? vehicle.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Diária</p>
                        <p className="text-xs font-semibold">R$ {vehicle.daily_rate}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Semanal</p>
                        <p className="text-xs font-semibold">R$ {vehicle.weekly_rate}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Mensal</p>
                        <p className="text-xs font-semibold">R$ {vehicle.monthly_rate}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <VehicleFormDialog open={formOpen} onOpenChange={setFormOpen} vehicle={editVehicle} />
      <VehicleDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        vehicleId={deleteTarget?.id ?? null}
        vehicleName={deleteTarget?.name ?? ""}
      />
    </AdminLayout>
  );
}
