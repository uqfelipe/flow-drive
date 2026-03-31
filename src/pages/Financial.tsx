import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Search, Check, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { usePayments, useUpdatePaymentStatus } from "@/hooks/use-payments";
import { toast } from "sonner";

const statusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  overdue: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Financial() {
  const { data: payments, isLoading } = usePayments();
  const updateStatus = useUpdatePaymentStatus();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const all = payments ?? [];

  const totalPaid = all.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = all.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = all.filter((p) => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0);
  const totalRevenue = totalPaid + totalPending + totalOverdue;

  const statusCounts = all.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = all.filter((p) => {
    const q = search.toLowerCase();
    const name = p.rentals?.customers?.name ?? "";
    const vehicle = p.rentals?.vehicles;
    const vehicleStr = vehicle ? `${vehicle.brand} ${vehicle.model}` : "";
    const matchesSearch = name.toLowerCase().includes(q) || vehicleStr.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

  const handleMarkPaid = (id: string) => {
    updateStatus.mutate({ id, status: "paid" }, {
      onSuccess: () => toast.success("Pagamento marcado como pago"),
      onError: () => toast.error("Erro ao atualizar pagamento"),
    });
  };

  const handleMarkPending = (id: string) => {
    updateStatus.mutate({ id, status: "pending" }, {
      onSuccess: () => toast.success("Pagamento marcado como pendente"),
      onError: () => toast.error("Erro ao atualizar pagamento"),
    });
  };

  const handleMarkOverdue = (id: string) => {
    updateStatus.mutate({ id, status: "overdue" }, {
      onSuccess: () => toast.success("Pagamento marcado como vencido"),
      onError: () => toast.error("Erro ao atualizar pagamento"),
    });
  };

  const stats = [
    { title: "Receita Total", value: fmt(totalRevenue), icon: TrendingUp, color: "text-primary" },
    { title: "Recebidos", value: fmt(totalPaid), icon: CheckCircle2, color: "text-success" },
    { title: "Pendentes", value: fmt(totalPending), icon: Clock, color: "text-warning" },
    { title: "Vencidos", value: fmt(totalOverdue), icon: AlertTriangle, color: "text-destructive" },
  ];

  const filterButtons = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendentes" },
    { value: "paid", label: "Pagos" },
    { value: "overdue", label: "Vencidos" },
  ];

  return (
    <AdminLayout title="Financeiro" subtitle="Pagamentos e receitas">
      <div className="p-6 space-y-6 animate-fade-in">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
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

            {/* Search + Filters */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou veículo..."
                  className="pl-9 bg-card"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {filterButtons.map((f) => {
                  const count = f.value === "all" ? all.length : (statusCounts[f.value] || 0);
                  return (
                    <Button
                      key={f.value}
                      variant={statusFilter === f.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(f.value)}
                      className="text-xs"
                    >
                      {f.label}
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{count}</Badge>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Payments List */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Pagamentos ({filtered.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum pagamento encontrado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((p) => {
                      const customerName = p.rentals?.customers?.name ?? "—";
                      const customerPhoto = p.rentals?.customers?.photo ?? null;
                      const vehicle = p.rentals?.vehicles;
                      const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : "—";
                      const st = statusMap[p.status] ?? statusMap.pending;
                      const isOverdue = p.status === "pending" && new Date(p.due_date) < new Date();

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 ${
                            isOverdue ? "border border-destructive/30" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              {customerPhoto ? (
                                <AvatarImage src={customerPhoto} alt={customerName} />
                              ) : null}
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {customerName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{customerName}</p>
                              <p className="text-[11px] text-muted-foreground">{vehicleName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-display font-semibold">{fmt(Number(p.amount))}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {p.paid_at ? `Pago: ${fmtDate(p.paid_at.slice(0, 10))}` : `Venc: ${fmtDate(p.due_date)}`}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {p.status !== "paid" && (
                                  <DropdownMenuItem onClick={() => handleMarkPaid(p.id)}>
                                    <Check className="h-4 w-4 mr-2 text-success" /> Marcar como Pago
                                  </DropdownMenuItem>
                                )}
                                {p.status !== "pending" && (
                                  <DropdownMenuItem onClick={() => handleMarkPending(p.id)}>
                                    <Clock className="h-4 w-4 mr-2 text-warning" /> Marcar como Pendente
                                  </DropdownMenuItem>
                                )}
                                {p.status !== "overdue" && (
                                  <DropdownMenuItem onClick={() => handleMarkOverdue(p.id)}>
                                    <AlertTriangle className="h-4 w-4 mr-2 text-destructive" /> Marcar como Vencido
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
