import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCustomer, useUpdateCustomer, type CustomerRow } from "@/hooks/use-customers";
import { useCustomerFieldDefinitions } from "@/hooks/use-customer-fields";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";

const IMGBB_API_KEY = "218e4f96aa83bbfd4e78abb8d60bad52";

async function uploadToImgbb(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: form });
  const json = await res.json();
  if (!json.success) throw new Error("Falha no upload");
  return json.data.url;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerRow | null;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: Props) {
  const { toast } = useToast();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const { data: fieldDefs } = useCustomerFieldDefinitions();
  const isEdit = !!customer;
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && customer) {
      setName(customer.name);
      setPhone(customer.phone);
      
      setStatus(customer.status);
      setNotes(customer.notes || "");
      setPhoto(customer.photo || null);
      setCustomFields(customer.custom_fields || {});
    } else if (open) {
      setName(""); setPhone(""); setStatus("active"); setNotes(""); setPhoto(null); setCustomFields({});
    }
  }, [open, customer]);

  // Ctrl+V paste support
  useEffect(() => {
    if (!open) return;
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
  }, [open, toast]);

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
      if (isEdit) {
        await updateMutation.mutateAsync({ id: customer!.id, name, phone, cpf: "", status, notes: notes || null, photo, custom_fields: customFields });
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        await createMutation.mutateAsync({ name, phone, cpf: "", status, photo, custom_fields: customFields });
        toast({ title: "Cliente criado com sucesso!" });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar cliente", description: err.message, variant: "destructive" });
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
              {photo ? (
                <img src={photo} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
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

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-2">
            <Label>Telefone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
          </div>
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
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o cliente..." rows={3} />
          </div>

          {/* Custom fields */}
          {fieldDefs && fieldDefs.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campos Personalizados</p>
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
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
