import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, CalendarCheck, MessageSquare } from "lucide-react";
import { useState } from "react";

const mockRentals = [
  { id: "1", customer: "João Silva", vehicle: "Toyota Corolla 2024", pickup: "15/03/2026", return: "30/03/2026", value: "R$ 2.700", rentalStatus: "active", paymentStatus: "paid", origin: "manual" },
  { id: "2", customer: "Maria Santos", vehicle: "Honda Civic 2023", pickup: "10/03/2026", return: "25/03/2026", value: "R$ 3.000", rentalStatus: "active", paymentStatus: "overdue", origin: "chatbot" },
  { id: "3", customer: "Carlos Lima", vehicle: "Hyundai HB20 2024", pickup: "01/04/2026", return: "08/04/2026", value: "R$ 840", rentalStatus: "pending", paymentStatus: "pending", origin: "chatbot" },
  { id: "4", customer: "Ana Costa", vehicle: "VW T-Cross 2024", pickup: "05/03/2026", return: "05/04/2026", value: "R$ 4.800", rentalStatus: "active", paymentStatus: "paid", origin: "manual" },
  { id: "5", customer: "Pedro Oliveira", vehicle: "Nissan Kicks 2023", pickup: "01/02/2026", return: "15/02/2026", value: "R$ 3.150", rentalStatus: "completed", paymentStatus: "paid", origin: "chatbot" },
];

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
  const filtered = mockRentals.filter(
    (r) => r.customer.toLowerCase().includes(search.toLowerCase()) || r.vehicle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Reservas" subtitle="Gerencie locações e reservas">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou veículo..." className="pl-9 bg-card" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filtrar</Button>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Reserva</Button>
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.map((rental) => (
            <Card key={rental.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {rental.origin === "chatbot" ? <MessageSquare className="h-4 w-4 text-primary" /> : <CalendarCheck className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{rental.customer}</p>
                      <p className="text-[11px] text-muted-foreground">{rental.vehicle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-[11px] text-muted-foreground">Retirada: {rental.pickup}</p>
                      <p className="text-[11px] text-muted-foreground">Devolução: {rental.return}</p>
                    </div>
                    <p className="font-display font-semibold text-sm min-w-[80px] text-right">{rental.value}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={`text-[10px] ${rentalStatusMap[rental.rentalStatus].className}`}>
                        {rentalStatusMap[rental.rentalStatus].label}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${paymentStatusMap[rental.paymentStatus].className}`}>
                        {paymentStatusMap[rental.paymentStatus].label}
                      </Badge>
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
