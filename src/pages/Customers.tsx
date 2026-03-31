import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Phone, FileText } from "lucide-react";
import { useState } from "react";
import { useCustomers } from "@/hooks/use-customers";
import { useRentals } from "@/hooks/use-rentals";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useCustomers();
  const { data: rentals } = useRentals();

  const rentalCounts = (rentals ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.customer_id] = (acc[r.customer_id] || 0) + 1;
    return acc;
  }, {});

  const filtered = (customers ?? []).filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <AdminLayout title="Clientes" subtitle="Gerencie seus clientes">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou telefone..." className="pl-9 bg-card" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>))}</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((customer) => (
              <Card key={customer.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                      {customer.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{customer.cpf}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{rentalCounts[customer.id] || 0} locações</p>
                    </div>
                    <Badge variant="outline" className={customer.status === "active" ? "bg-success/10 text-success border-success/20 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                      {customer.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
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
