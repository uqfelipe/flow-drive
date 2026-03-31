import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Users,
  CalendarCheck,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";

const stats = [
  { title: "Total de Veículos", value: "24", icon: Car, change: "+2 este mês", color: "text-primary" },
  { title: "Disponíveis", value: "14", icon: CheckCircle2, change: "58% da frota", color: "text-success" },
  { title: "Alugados", value: "8", icon: CalendarCheck, change: "33% da frota", color: "text-warning" },
  { title: "Em Manutenção", value: "2", icon: Clock, change: "8% da frota", color: "text-muted-foreground" },
];

const financialStats = [
  { title: "Receita Mensal", value: "R$ 45.680", icon: TrendingUp, color: "text-success" },
  { title: "Pagamentos Pendentes", value: "R$ 12.400", icon: DollarSign, color: "text-warning" },
  { title: "Pagamentos Vencidos", value: "R$ 3.200", icon: AlertTriangle, color: "text-destructive" },
  { title: "Clientes Ativos", value: "42", icon: Users, color: "text-primary" },
];

const recentAlerts = [
  { message: "Devolução de Toyota Corolla - João Silva em 2 dias", type: "warning" as const },
  { message: "Pagamento vencido - Maria Santos (Civic)", type: "error" as const },
  { message: "Nova reserva via WhatsApp - Carlos Lima", type: "info" as const },
  { message: "Veículo HB20 retornou da manutenção", type: "success" as const },
];

const recentRentals = [
  { customer: "João Silva", vehicle: "Toyota Corolla 2024", status: "active", value: "R$ 2.400" },
  { customer: "Maria Santos", vehicle: "Honda Civic 2023", status: "overdue", value: "R$ 1.800" },
  { customer: "Carlos Lima", vehicle: "Hyundai HB20 2024", status: "pending", value: "R$ 960" },
  { customer: "Ana Costa", vehicle: "VW T-Cross 2024", status: "active", value: "R$ 3.200" },
];

const statusMap = {
  active: { label: "Ativo", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20" },
  pending: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
};

const alertTypeMap = {
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
};

export default function Dashboard() {
  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral da sua locadora">
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Fleet Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="bg-card border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-display font-bold">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.change}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialStats.map((stat) => (
            <Card key={stat.title} className="bg-card border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-display font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Alerts */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alertas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg text-xs ${alertTypeMap[alert.type]}`}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                  {alert.message}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Rentals */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Locações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRentals.map((rental, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{rental.customer}</p>
                      <p className="text-[11px] text-muted-foreground">{rental.vehicle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium">{rental.value}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${statusMap[rental.status as keyof typeof statusMap].className}`}
                      >
                        {statusMap[rental.status as keyof typeof statusMap].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
