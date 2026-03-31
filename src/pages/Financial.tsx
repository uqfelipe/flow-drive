import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const stats = [
  { title: "Receita Total", value: "R$ 145.200", icon: TrendingUp, color: "text-success" },
  { title: "Pagamentos Recebidos", value: "R$ 129.600", icon: CheckCircle2, color: "text-success" },
  { title: "Pendentes", value: "R$ 12.400", icon: Clock, color: "text-warning" },
  { title: "Vencidos", value: "R$ 3.200", icon: AlertTriangle, color: "text-destructive" },
];

const payments = [
  { customer: "João Silva", vehicle: "Toyota Corolla 2024", amount: "R$ 2.700", due: "30/03/2026", status: "paid" },
  { customer: "Maria Santos", vehicle: "Honda Civic 2023", amount: "R$ 3.000", due: "25/03/2026", status: "overdue" },
  { customer: "Carlos Lima", vehicle: "Hyundai HB20 2024", amount: "R$ 840", due: "08/04/2026", status: "pending" },
  { customer: "Ana Costa", vehicle: "VW T-Cross 2024", amount: "R$ 4.800", due: "05/04/2026", status: "pending" },
  { customer: "Pedro Oliveira", vehicle: "Nissan Kicks 2023", amount: "R$ 3.150", due: "15/02/2026", status: "paid" },
];

const statusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  overdue: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Financial() {
  return (
    <AdminLayout title="Financeiro" subtitle="Pagamentos e receitas">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="bg-card border-border">
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

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{p.customer}</p>
                    <p className="text-[11px] text-muted-foreground">{p.vehicle}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-display font-semibold">{p.amount}</p>
                      <p className="text-[11px] text-muted-foreground">Venc: {p.due}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusMap[p.status].className}`}>
                      {statusMap[p.status].label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
