import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { usePayments } from "@/hooks/use-payments";

const statusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  overdue: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Financial() {
  const { data: payments, isLoading } = usePayments();

  const totalPaid = (payments ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = (payments ?? []).filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = (payments ?? []).filter((p) => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0);
  const totalRevenue = totalPaid + totalPending + totalOverdue;

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  const stats = [
    { title: "Receita Total", value: fmt(totalRevenue), icon: TrendingUp, color: "text-success" },
    { title: "Pagamentos Recebidos", value: fmt(totalPaid), icon: CheckCircle2, color: "text-success" },
    { title: "Pendentes", value: fmt(totalPending), icon: Clock, color: "text-warning" },
    { title: "Vencidos", value: fmt(totalOverdue), icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <AdminLayout title="Financeiro" subtitle="Pagamentos e receitas">
      <div className="p-6 space-y-6 animate-fade-in">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (<Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.title} className="bg-card border-border">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                        <p className="text-2xl font-display font-bold">{stat.value}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg bg-muted ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(payments ?? []).map((p) => {
                    const customerName = p.rentals?.customers?.name ?? "—";
                    const vehicle = p.rentals?.vehicles;
                    const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : "—";
                    const st = statusMap[p.status] ?? statusMap.pending;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{customerName}</p>
                          <p className="text-[11px] text-muted-foreground">{vehicleName}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-display font-semibold">{fmt(Number(p.amount))}</p>
                            <p className="text-[11px] text-muted-foreground">Venc: {new Date(p.due_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
