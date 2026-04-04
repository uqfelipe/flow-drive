import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Phone, FileText, Pencil, Trash2, Users, Settings2 } from "lucide-react";
import { useState } from "react";
import { useCustomers, type CustomerRow } from "@/hooks/use-customers";
import { useRentals } from "@/hooks/use-rentals";
import { CustomerFormDialog } from "@/components/CustomerFormDialog";
import { CustomerDeleteDialog } from "@/components/CustomerDeleteDialog";
import { CustomerFieldsManager } from "@/components/CustomerFieldsManager";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useCustomers();
  const { data: rentals } = useRentals();

  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);

  const rentalCounts = (rentals ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.customer_id] = (acc[r.customer_id] || 0) + 1;
    return acc;
  }, {});

  const filtered = (customers ?? []).filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.cpf.includes(search)
  );

  const handleEdit = (customer: CustomerRow) => {
    setEditCustomer(customer);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditCustomer(null);
    setFormOpen(true);
  };

  const handleDelete = (customer: CustomerRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(customer);
    setDeleteOpen(true);
  };

  return (
    <AdminLayout title="Clientes" subtitle="Gerencie seus clientes">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, telefone ou CPF..." className="pl-9 bg-card" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleNew}><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">{search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
            {!search && <Button size="sm" variant="outline" className="mt-3" onClick={handleNew}>Cadastrar primeiro cliente</Button>}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((customer) => (
              <Card key={customer.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer" onClick={() => handleEdit(customer)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm overflow-hidden">
                      {customer.photo ? (
                        <img src={customer.photo} alt={customer.name} className="h-full w-full object-cover" />
                      ) : (
                        customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone.startsWith("+") ? customer.phone : `+${customer.phone}`}</span>
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{customer.cpf}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{rentalCounts[customer.id] || 0} locações</p>
                    </div>
                    <Badge variant="outline" className={customer.status === "active" ? "bg-success/10 text-success border-success/20 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                      {customer.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => handleDelete(customer, e)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editCustomer} />
      <CustomerDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} customerId={deleteTarget?.id ?? null} customerName={deleteTarget?.name ?? ""} />
    </AdminLayout>
  );
}
