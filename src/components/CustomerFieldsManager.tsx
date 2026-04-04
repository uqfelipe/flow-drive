import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomerFieldDefinitions, useCreateFieldDefinition, useDeleteFieldDefinition } from "@/hooks/use-customer-fields";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Plus, Trash2, Variable } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerFieldsManager({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: fields, isLoading } = useCustomerFieldDefinitions();
  const createMutation = useCreateFieldDefinition();
  const deleteMutation = useDeleteFieldDefinition();

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");

  const handleAdd = async () => {
    const cleanKey = key.replace(/[{}]/g, "").trim().toLowerCase().replace(/\s+/g, "_");
    if (!cleanKey || !label.trim()) {
      toast({ title: "Preencha a variável e o rótulo", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({ field_key: cleanKey, field_label: label.trim(), field_type: type });
      toast({ title: "Campo adicionado!" });
      setKey(""); setLabel(""); setType("text");
    } catch (err: any) {
      toast({ title: "Erro ao criar campo", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Campo removido" });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Variable className="h-5 w-5" />
            Campos Personalizados
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Crie campos que serão preenchidos automaticamente pelo chatbot via <code className="bg-muted px-1 rounded">capture_text</code>.
          Use a mesma variável no fluxo (ex: <code className="bg-muted px-1 rounded">{`{{email}}`}</code>).
        </p>

        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Variável</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="email"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rótulo</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="E-mail"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-24 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="location">Localização</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending} className="mb-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
          ) : !fields?.length ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum campo personalizado criado</p>
          ) : (
            fields.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{f.field_label}</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 rounded">{`{{${f.field_key}}}`}</code>
                    <span className="ml-2">{f.field_type}</span>
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(f.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
