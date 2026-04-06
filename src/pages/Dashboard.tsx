import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Car, Users, CalendarCheck, DollarSign, AlertTriangle, TrendingUp, Clock, CheckCircle2,
} from "lucide-react";
import { useVehicles } from "@/hooks/use-vehicles";

import { usePayments } from "@/hooks/use-payments";
import { useCustomers } from "@/hooks/use-customers";

import { NotesBlock } from "@/components/NotesBlock";



export default function Dashboard() {
  const { data: vehicles, isLoading: vLoading } = useVehicles();
  
  const { data: payments, isLoading: pLoading } = usePayments();
  const { data: customers, isLoading: cLoading } = useCustomers();
  

  const isLoading = vLoading || pLoading || cLoading;

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

            <div className="grid grid-cols-1 gap-6">
              <NotesBlock />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
