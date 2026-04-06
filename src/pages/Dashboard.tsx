import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car, Users, CalendarCheck, DollarSign, TrendingUp, Clock, CheckCircle2,
} from "lucide-react";
import { useVehicles } from "@/hooks/use-vehicles";
import { useRentals } from "@/hooks/use-rentals";
import { usePayments } from "@/hooks/use-payments";
import { useCustomers } from "@/hooks/use-customers";

import { NotesBlock } from "@/components/NotesBlock";

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success/10 text-success border-success/30" },
  overdue: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/30" },
  pending: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/30" },
  completed: { label: "Concluído", className: "bg-muted text-muted-foreground border-border" },
};


export default function Dashboard() {
  const { data: vehicles, isLoading: vLoading } = useVehicles();
  const { data: rentals, isLoading: rLoading } = useRentals();
  const { data: payments, isLoading: pLoading } = usePayments();
  const { data: customers, isLoading: cLoading } = useCustomers();
  const { data: notifications } = useNotifications();

  const isLoading = vLoading || rLoading || pLoading || cLoading;

  const totalVehicles = vehicles?.length ?? 0;
  const available = vehicles?.filter((v) => v.status === "available").length ?? 0;
  const rented = vehicles?.filter((v) => v.status === "rented").length ?? 0;
  const maintenance = vehicles?.filter((v) => v.status === "maintenance").length ?? 0;

  const totalPaid = payments?.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const totalPending = payments?.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const totalOverdue = payments?.filter((p) => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const activeCustomers = customers?.filter((c) => c.status === "active").length ?? 0;

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  const stats = [
    { title: "Total de Veículos", value: String(totalVehicles), icon: Car, change: `${available} disponíveis`, color: "text-primary", bg: "bg-primary/10" },
    { title: "Disponíveis", value: String(available), icon: CheckCircle2, change: totalVehicles ? `${Math.round((available / totalVehicles) * 100)}% da frota` : "—", color: "text-success", bg: "bg-success/10" },
    { title: "Alugados", value: String(rented), icon: CalendarCheck, change: totalVehicles ? `${Math.round((rented / totalVehicles) * 100)}% da frota` : "—", color: "text-warning", bg: "bg-warning/10" },
    { title: "Em Manutenção", value: String(maintenance), icon: Clock, change: totalVehicles ? `${Math.round((maintenance / totalVehicles) * 100)}% da frota` : "—", color: "text-muted-foreground", bg: "bg-muted" },
  ];

  const financialStats = [
    { title: "Pagamentos Recebidos", value: fmt(totalPaid), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
    { title: "Pagamentos Pendentes", value: fmt(totalPending), icon: DollarSign, color: "text-warning", bg: "bg-warning/10" },
    { title: "Pagamentos Vencidos", value: fmt(totalOverdue), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { title: "Clientes Ativos", value: String(activeCustomers), icon: Users, color: "text-primary", bg: "bg-primary/10" },
  ];

  const recentRentals = (rentals ?? []).slice(0, 4);
  const alerts = (notifications ?? []).filter((n) => !n.read).slice(0, 4);

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral da sua locadora">
      <div className="p-6 space-y-6 animate-fade-in">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (<Card key={i} className="border-border/60"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.title} className="card-hover-lift border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                        <p className="text-2xl font-display font-bold">{stat.value}</p>
                        <p className="text-[11px] text-muted-foreground">{stat.change}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {financialStats.map((stat) => (
                <Card key={stat.title} className="card-hover-lift border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                        <p className="text-2xl font-display font-bold">{stat.value}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Alertas Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alerts.length === 0 && <p className="text-xs text-muted-foreground">Nenhum alerta pendente.</p>}
                  {alerts.map((alert) => {
                    const style = alertTypeMap[alert.type] || alertTypeMap.info;
                    return (
                      <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg text-xs border-l-2 ${style.bg}`}>
                        <div className={`h-1.5 w-1.5 rounded-full bg-current shrink-0 ${style.text}`} />
                        <span className="text-foreground/90">{alert.message}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-primary" /> Locações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentRentals.map((rental) => {
                      const vehicleName = rental.vehicles ? `${rental.vehicles.brand} ${rental.vehicles.model} ${rental.vehicles.year}` : "—";
                      const st = statusMap[rental.payment_status] || statusMap.pending;
                      return (
                        <div key={rental.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium">{rental.customers?.name ?? "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{vehicleName}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold">{fmt(Number(rental.total_value))}</span>
                            <Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <NotesBlock />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
