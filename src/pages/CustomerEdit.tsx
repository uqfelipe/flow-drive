import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateCustomer, useCustomers, type CustomerRow } from "@/hooks/use-customers";
import { useCustomerFieldDefinitions } from "@/hooks/use-customer-fields";
import { useRentals } from "@/hooks/use-rentals";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, ImageIcon, Save, Car, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

const IMGBB_API_KEY = "218e4f96aa83bbfd4e78abb8d60bad52";

async function uploadToImgbb(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: form });
  const json = await res.json();
  if (!json.success) throw new Error("Falha no upload");
  return json.data.url;
}

export default function CustomerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: customers, isLoading } = useCustomers();
  const { data: rentals } = useRentals();
  const { data: fieldDefs } = useCustomerFieldDefinitions();
  const updateMutation = useUpdateCustomer();
  const fileRef = useRef<HTMLInputElement>(null);

  const customer = customers?.find((c) => c.id === id) ?? null;
  const customerRentals = (rentals ?? []).filter((r) => r.customer_id === id);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (customer && !initialized) {
      setName(customer.name);
      setPhone(customer.phone);
      setStatus(customer.status);
      setNotes(customer.notes || "");
      setPhoto(customer.photo || null);
      setCustomFields(customer.custom_fields || {});
      setInitialized(true);
    }
  }, [customer, initialized]);

  // Ctrl+V paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          setUploading(true);
          try {
            const url = await uploadToImgbb(file);
            setPhoto(url);
            toast({ title: "Foto colada com sucesso!" });
          } catch { toast({ title: "Erro ao colar foto", variant: "destructive" }); }
          setUploading(false);
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToImgbb(file);
      setPhoto(url);
      toast({ title: "Foto enviada!" });
    } catch { toast({ title: "Erro no upload", variant: "destructive" }); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: id!, name, phone, cpf: "", status, notes: notes || null, photo, custom_fields: customFields });
      toast({ title: "Cliente atualizado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Editar Cliente" subtitle="">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout title="Cliente não encontrado" subtitle="">
        <div className="p-6 flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>Cliente não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-success/10 text-success border-success/20";
      case "completed": return "bg-primary/10 text-primary border-primary/20";
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { pending: "Pendente", approved: "Aprovada", active: "Ativa", completed: "Concluída", cancelled: "Cancelada" };
    return map[s] || s;
  };

  return (
    <AdminLayout title="Editar Cliente" subtitle={customer.name}>
      <div className="p-6 animate-fade-in">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/customers")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Clientes
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Photo */}
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border shrink-0">
                      {photo ? (
                        <img src={photo} alt="Foto" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                          <Upload className="h-3.5 w-3.5 mr-1" />{uploading ? "Enviando..." : "Upload"}
                        </Button>
                        {photo && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => setPhoto(null)}>
                            <X className="h-3.5 w-3.5 mr-1" />Remover
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Ou cole com Ctrl+V</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone *</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o cliente..." rows={4} />
                  </div>

                  {/* Custom fields */}
                  {fieldDefs && fieldDefs.length > 0 && (
                    <div className="space-y-4 border-t border-border pt-5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campos Personalizados</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {fieldDefs.map((fd) => (
                          <div key={fd.id} className="space-y-1.5">
                            <Label className="text-xs">
                              {fd.field_label}
                              <span className="text-muted-foreground ml-1 font-normal">{`{{${fd.field_key}}}`}</span>
                            </Label>
                            <Input
                              type={fd.field_type === "email" ? "email" : fd.field_type === "phone" ? "tel" : "text"}
                              value={customFields[fd.field_key] || ""}
                              onChange={(e) => setCustomFields(prev => ({ ...prev, [fd.field_key]: e.target.value }))}
                              placeholder={fd.field_label}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => navigate("/customers")}>Cancelar</Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4 mr-1" />
                      {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — rental history */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Car className="h-4 w-4" /> Histórico de Locações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customerRentals.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Nenhuma locação encontrada</p>
                ) : (
                  <div className="space-y-3">
                    {customerRentals.map((r) => (
                      <div key={r.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={`text-[10px] ${statusColor(r.rental_status)}`}>
                            {statusLabel(r.rental_status)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(r.created_at), "dd/MM/yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(r.pickup_date), "dd/MM")} → {format(new Date(r.return_date), "dd/MM")}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <DollarSign className="h-3 w-3" />
                          R$ {Number(r.total_value).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Criado em</span>
                    <span>{format(new Date(customer.created_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Atualizado em</span>
                    <span>{format(new Date(customer.updated_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total de locações</span>
                    <span className="font-medium text-foreground">{customerRentals.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
