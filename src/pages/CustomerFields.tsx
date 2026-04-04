import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCustomerFieldDefinitions, useCreateFieldDefinition, useDeleteFieldDefinition } from "@/hooks/use-customer-fields";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Plus, Trash2, Variable, Lightbulb, Info } from "lucide-react";

const typeLabels: Record<string, string> = {
  text: "Texto",
  email: "E-mail",
  phone: "Telefone",
  number: "Número",
  image: "Imagem",
  audio: "Áudio",
  file: "Arquivo",
};

const typeBadgeColors: Record<string, string> = {
  text: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  email: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  phone: "bg-green-500/10 text-green-400 border-green-500/20",
  number: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  image: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  audio: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  file: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export default function CustomerFields() {
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
      toast({ title: "Campo adicionado com sucesso!" });
      setKey("");
      setLabel("");
      setType("text");
    } catch (err: any) {
      toast({ title: "Erro ao criar campo", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, fieldLabel: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: `"${fieldLabel}" removido` });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout title="Campos Personalizados" subtitle="Gerencie variáveis capturadas pelo chatbot">
      <div className="p-6 animate-fade-in">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main — field list */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Variable className="h-4 w-4 text-primary" />
                  Campos Cadastrados
                  {fields?.length ? (
                    <Badge variant="secondary" className="text-[10px] ml-1">{fields.length}</Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-12">Carregando...</div>
                ) : !fields?.length ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Variable className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nenhum campo personalizado</p>
                    <p className="text-xs mt-1">Crie seu primeiro campo no formulário ao lado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm font-medium">{f.field_label}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <code className="text-xs font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                                {`{{${f.field_key}}}`}
                              </code>
                              <Badge variant="outline" className={`text-[10px] ${typeBadgeColors[f.field_type] || ""}`}>
                                {typeLabels[f.field_type] || f.field_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDelete(f.id, f.field_label)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover campo</TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — add form + tips */}
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Novo Campo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Variável</Label>
                  <Input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="ex: email"
                    className="text-sm bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rótulo</Label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="ex: E-mail do cliente"
                    className="text-sm bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="text-sm bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="audio">Áudio</SelectItem>
                      <SelectItem value="file">Arquivo</SelectItem>
                      <SelectItem value="location">Localização</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" size="sm" onClick={handleAdd} disabled={createMutation.isPending}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Campo
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border border-dashed">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium mb-1">Como usar</p>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">
                       Use os nós <code className="bg-muted px-1 rounded text-[10px]">capture_text</code>,{" "}
                       <code className="bg-muted px-1 rounded text-[10px]">capture_image</code>,{" "}
                       <code className="bg-muted px-1 rounded text-[10px]">capture_audio</code>,{" "}
                       <code className="bg-muted px-1 rounded text-[10px]">capture_file</code> ou{" "}
                       <code className="bg-muted px-1 rounded text-[10px]">capture_location</code> no
                       Construtor de Fluxos para capturar dados do cliente automaticamente.
                     </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    A variável criada aqui (ex: <code className="bg-muted px-1 rounded text-[10px]">{`{{email}}`}</code>)
                    deve ser referenciada com o mesmo nome no fluxo. O valor capturado será salvo nos campos
                    personalizados do cliente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
