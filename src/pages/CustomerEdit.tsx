import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpdateCustomer, useCustomers } from "@/hooks/use-customers";
import { useCustomerFieldDefinitions } from "@/hooks/use-customer-fields";
import { useRentals } from "@/hooks/use-rentals";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, ImageIcon, Save, Calendar, DollarSign, Clock, FileText, User, Car, Paperclip, Image, Mic, File } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

  const { data: customerFiles } = useQuery({
    queryKey: ["customer_files", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_files")
        .select("*")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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
      <div className="p-4 md:p-6 animate-fade-in">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate("/customers")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <form onSubmit={handleSubmit}>
          {/* Compact Header */}
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                {/* Photo */}
                <div className="relative group shrink-0">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                    {photo ? (
                      <img src={photo} alt="Foto" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button type="button" className="p-1 hover:text-primary transition-colors" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                    {photo && (
                      <button type="button" className="p-1 hover:text-destructive transition-colors" onClick={() => setPhoto(null)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">{name || customer.name}</h2>
                  <p className="text-sm text-muted-foreground truncate">{phone || customer.phone}</p>
                </div>

                {/* Status badge */}
                <Badge variant="outline" className={`shrink-0 ${status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}`}>
                  {status === "active" ? "Ativo" : "Inativo"}
                </Badge>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate("/customers")}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Tabs */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="pt-5">
                  <Tabs defaultValue="dados">
                    <TabsList className="mb-4">
                      <TabsTrigger value="dados" className="gap-1.5">
                        <User className="h-3.5 w-3.5" /> Dados
                      </TabsTrigger>
                      {fieldDefs && fieldDefs.length > 0 && (
                        <TabsTrigger value="campos" className="gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Campos Personalizados
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="locacoes" className="gap-1.5">
                        <Car className="h-3.5 w-3.5" /> Locações
                        {customerRentals.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{customerRentals.length}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab: Dados */}
                    <TabsContent value="dados" className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nome *</Label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Telefone *</Label>
                          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Status</Label>
                          <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="inactive">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Observações</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o cliente..." rows={2} />
                      </div>
                    </TabsContent>

                    {/* Tab: Campos Personalizados */}
                    {fieldDefs && fieldDefs.length > 0 && (
                      <TabsContent value="campos">
                        <TooltipProvider>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {fieldDefs.map((fd) => (
                              <div key={fd.id} className="space-y-1.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Label className="text-xs cursor-help">{fd.field_label}</Label>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs font-mono">{`{{${fd.field_key}}}`}</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Input
                                  type={fd.field_type === "email" ? "email" : fd.field_type === "phone" ? "tel" : "text"}
                                  value={customFields[fd.field_key] || ""}
                                  onChange={(e) => setCustomFields(prev => ({ ...prev, [fd.field_key]: e.target.value }))}
                                  placeholder={fd.field_label}
                                />
                              </div>
                            ))}
                          </div>
                        </TooltipProvider>
                      </TabsContent>
                    )}

                    {/* Tab: Locações */}
                    <TabsContent value="locacoes">
                      {customerRentals.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Car className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Nenhuma locação encontrada</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar — metadata only */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informações</p>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Criado em</p>
                        <p>{format(new Date(customer.created_at), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Atualizado em</p>
                        <p>{format(new Date(customer.updated_at), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="h-3.5 w-3.5 shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Total de locações</p>
                        <p className="text-foreground">{customerRentals.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
