import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Filter, CalendarCheck, MessageSquare, Car } from "lucide-react";
import { useState } from "react";
import { useRentals } from "@/hooks/use-rentals";
import { RentalFormDialog } from "@/components/RentalFormDialog";

const rentalStatusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Aprovada", className: "bg-primary/10 text-primary border-primary/20" },
  active: { label: "Ativa", className: "bg-success/10 text-success border-success/20" },
  completed: { label: "Concluída", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelada", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const paymentStatusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  paid: { label: "Pago", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Rentals() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const { data: rentals, isLoading } = useRentals();

  const allRentals = rentals ?? [];

  const statusCounts = allRentals.reduce<Record<string, number>>((acc, r) => {
    acc[r.rental_status] = (acc[r.rental_status] || 0) + 1;
    return acc;
  }, {});

  const filtered = allRentals.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = (r.customers?.name ?? "").toLowerCase().includes(q) ||
      (r.vehicles ? `${r.vehicles.brand} ${r.vehicles.model}` : "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.rental_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

  return (
    <AdminLayout title="Reservas" subtitle="Gerencie locações e reservas">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou veículo..." className="pl-9 bg-card" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: "all", label: "Todas" },
            { value: "pending", label: "Pendente" },
            { value: "approved", label: "Aprovada" },
            { value: "active", label: "Ativa" },
            { value: "completed", label: "Concluída" },
            { value: "cancelled", label: "Cancelada" },
          ].map((s) => {
            const count = s.value === "all" ? allRentals.length : (statusCounts[s.value] || 0);
            return (
              <Button
                key={s.value}
                variant={statusFilter === s.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s.value)}
                className="text-xs"
              >
                {s.label}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{count}</Badge>
              </Button>
            );
          })}
        </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filtrar</Button>
            <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova Reserva</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>))}</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((rental) => {
              const vehicleName = rental.vehicles ? `${rental.vehicles.brand} ${rental.vehicles.model} ${rental.vehicles.year}` : "—";
              const rs = rentalStatusMap[rental.rental_status] ?? rentalStatusMap.pending;
              const ps = paymentStatusMap[rental.payment_status] ?? paymentStatusMap.pending;
              return (
                <Card key={rental.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-10 w-10 border border-border">
                            {rental.customers?.photo ? (
                              <AvatarImage src={rental.customers.photo} alt={rental.customers?.name ?? ""} />
                            ) : null}
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {(rental.customers?.name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="h-10 w-14 rounded-lg bg-muted overflow-hidden flex items-center justify-center border border-border">
                            {rental.vehicles?.images?.[0] ? (
                              <img src={rental.vehicles.images[0]} alt={vehicleName} className="h-full w-full object-cover" />
                            ) : (
                              <Car className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{rental.customers?.name ?? "—"}</p>
                          <p className="text-[11px] text-muted-foreground">{vehicleName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[11px] text-muted-foreground">Retirada: {fmtDate(rental.pickup_date)}</p>
                          <p className="text-[11px] text-muted-foreground">Devolução: {fmtDate(rental.return_date)}</p>
                        </div>
                        <p className="font-display font-semibold text-sm min-w-[80px] text-right">{fmt(Number(rental.total_value))}</p>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={`text-[10px] ${rs.className}`}>{rs.label}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${ps.className}`}>{ps.label}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <RentalFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </AdminLayout>
  );
}
