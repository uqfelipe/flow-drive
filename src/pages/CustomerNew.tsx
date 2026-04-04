import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCustomer } from "@/hooks/use-customers";
import { useCustomerFieldDefinitions } from "@/hooks/use-customer-fields";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, ImageIcon, Save } from "lucide-react";

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
      const created = await createMutation.mutateAsync({ name, phone, cpf: "", status, photo, custom_fields: customFields });
      toast({ title: "Cliente criado com sucesso!" });
      navigate(`/customers/${created.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao criar cliente", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout title="Novo Cliente" subtitle="Cadastrar novo cliente">
      <div className="p-6 animate-fade-in">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/customers")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Clientes
        </Button>

        <div className="max-w-2xl">
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
                  <Button type="submit" disabled={createMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {createMutation.isPending ? "Criando..." : "Criar Cliente"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
