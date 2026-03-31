import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Car, Filter } from "lucide-react";
import { useState } from "react";
import { useVehicles } from "@/hooks/use-vehicles";
import type { VehicleStatus } from "@/types";

const statusConfig: Record<VehicleStatus, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-success/10 text-success border-success/30" },
  reserved: { label: "Reservado", className: "bg-warning/10 text-warning border-warning/30" },
  rented: { label: "Alugado", className: "bg-primary/10 text-primary border-primary/30" },
  maintenance: { label: "Manutenção", className: "bg-muted text-muted-foreground border-border" },
  inactive: { label: "Inativo", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const { data: vehicles, isLoading } = useVehicles();

  const filtered = (vehicles ?? []).filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Veículos" subtitle="Gerencie sua frota">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar veículo, marca ou placa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filtrar</Button>
            <Button size="sm" className="shadow-glow-sm"><Plus className="h-4 w-4 mr-1" /> Novo Veículo</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-0"><Skeleton className="h-40 w-full" /><div className="p-4"><Skeleton className="h-16 w-full" /></div></CardContent></Card>))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vehicle) => (
              <Card key={vehicle.id} className="card-hover-lift border-border/60 overflow-hidden cursor-pointer group">
                <CardContent className="p-0">
                  <div className="h-40 bg-muted/50 flex items-center justify-center">
                    <Car className="h-12 w-12 text-muted-foreground/20 group-hover:text-primary/30 transition-colors duration-300" />
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
    </AdminLayout>
  );
}
