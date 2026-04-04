import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreateCustomer } from "@/hooks/use-customers";
import { useCustomerFieldDefinitions } from "@/hooks/use-customer-fields";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, ImageIcon, Save, User, FileText } from "lucide-react";

const IMGBB_API_KEY = "218e4f96aa83bbfd4e78abb8d60bad52";

async function uploadToImgbb(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: form });
  const json = await res.json();
  if (!json.success) throw new Error("Falha no upload");
  return json.data.url;
}

export default function CustomerNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createMutation = useCreateCustomer();
  const { data: fieldDefs } = useCustomerFieldDefinitions();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

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
      const created = await createMutation.mutateAsync({ name, phone, cpf: "", status, photo, custom_fields: customFields });
      toast({ title: "Cliente criado com sucesso!" });
      navigate(`/customers/${created.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao criar cliente", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout title="Novo Cliente" subtitle="Cadastrar novo cliente">
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
                  <h2 className="text-lg font-semibold text-foreground">{name || "Novo Cliente"}</h2>
                  <p className="text-sm text-muted-foreground">{phone || "Preencha os dados abaixo"}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate("/customers")}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={createMutation.isPending}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {createMutation.isPending ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main content */}
          <div className="max-w-3xl">
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
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
