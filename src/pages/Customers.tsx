import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Phone, FileText } from "lucide-react";
import { useState } from "react";

const mockCustomers = [
  { id: "1", name: "João Silva", phone: "(11) 99999-1111", cpf: "123.456.789-00", rentals: 5, status: "active" },
  { id: "2", name: "Maria Santos", phone: "(11) 99999-2222", cpf: "234.567.890-11", rentals: 3, status: "active" },
  { id: "3", name: "Carlos Lima", phone: "(21) 98888-3333", cpf: "345.678.901-22", rentals: 1, status: "active" },
  { id: "4", name: "Ana Costa", phone: "(31) 97777-4444", cpf: "456.789.012-33", rentals: 8, status: "active" },
  { id: "5", name: "Pedro Oliveira", phone: "(41) 96666-5555", cpf: "567.890.123-44", rentals: 2, status: "inactive" },
];

export default function Customers() {
  const [search, setSearch] = useState("");
  const filtered = mockCustomers.filter(
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
                    <p className="text-xs text-muted-foreground">{customer.rentals} locações</p>
                  </div>
                  <Badge variant="outline" className={customer.status === "active" ? "bg-success/10 text-success border-success/20 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                    {customer.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
