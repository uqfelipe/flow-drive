import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Car, Filter } from "lucide-react";
import { useState } from "react";
import type { Vehicle, VehicleStatus } from "@/types";

const mockVehicles: Vehicle[] = [
  { id: "1", name: "Corolla GLi", brand: "Toyota", model: "Corolla", year: 2024, plate: "ABC-1234", color: "Branco", category: "sedan", daily_rate: 180, weekly_rate: 1100, monthly_rate: 3800, description: "Sedan confortável e econômico", status: "available", images: [], created_at: "" },
  { id: "2", name: "Civic EXL", brand: "Honda", model: "Civic", year: 2023, plate: "DEF-5678", color: "Preto", category: "sedan", daily_rate: 200, weekly_rate: 1250, monthly_rate: 4200, description: "Sedan premium com tecnologia", status: "rented", images: [], created_at: "" },
  { id: "3", name: "HB20 Sense", brand: "Hyundai", model: "HB20", year: 2024, plate: "GHI-9012", color: "Prata", category: "hatch", daily_rate: 120, weekly_rate: 750, monthly_rate: 2600, description: "Compacto econômico", status: "available", images: [], created_at: "" },
  { id: "4", name: "T-Cross Comfortline", brand: "VW", model: "T-Cross", year: 2024, plate: "JKL-3456", color: "Cinza", category: "suv", daily_rate: 220, weekly_rate: 1400, monthly_rate: 4800, description: "SUV compacto versátil", status: "rented", images: [], created_at: "" },
  { id: "5", name: "Onix Plus", brand: "Chevrolet", model: "Onix Plus", year: 2024, plate: "MNO-7890", color: "Vermelho", category: "sedan", daily_rate: 140, weekly_rate: 850, monthly_rate: 3000, description: "Sedan com bom custo-benefício", status: "maintenance", images: [], created_at: "" },
  { id: "6", name: "Kicks Advance", brand: "Nissan", model: "Kicks", year: 2023, plate: "PQR-1234", color: "Azul", category: "suv", daily_rate: 210, weekly_rate: 1300, monthly_rate: 4500, description: "SUV espaçoso e conectado", status: "available", images: [], created_at: "" },
];

const statusConfig: Record<VehicleStatus, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-success/10 text-success border-success/30" },
  reserved: { label: "Reservado", className: "bg-warning/10 text-warning border-warning/30" },
  rented: { label: "Alugado", className: "bg-primary/10 text-primary border-primary/30" },
  maintenance: { label: "Manutenção", className: "bg-muted text-muted-foreground border-border" },
  inactive: { label: "Inativo", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const filtered = mockVehicles.filter(
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
            <Input
              placeholder="Buscar veículo, marca ou placa..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" /> Filtrar
            </Button>
            <Button size="sm" className="shadow-glow-sm">
              <Plus className="h-4 w-4 mr-1" /> Novo Veículo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vehicle) => (
            <Card
              key={vehicle.id}
              className="card-hover-lift border-border/60 overflow-hidden cursor-pointer group"
            >
              <CardContent className="p-0">
                <div className="h-40 bg-muted/50 flex items-center justify-center">
                  <Car className="h-12 w-12 text-muted-foreground/20 group-hover:text-primary/30 transition-colors duration-300" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-sm">{vehicle.name}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {vehicle.brand} • {vehicle.year} • {vehicle.plate}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusConfig[vehicle.status].className}`}>
                      {statusConfig[vehicle.status].label}
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
      </div>
    </AdminLayout>
  );
}
