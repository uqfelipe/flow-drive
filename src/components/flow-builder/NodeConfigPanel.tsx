import { getNodeTypeConfig } from "./nodeTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { FlowNodeData } from "@/types";

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

const categoryTextColors: Record<string, string> = {
  trigger: "text-node-trigger",
  message: "text-node-message",
  logic: "text-node-logic",
  input: "text-node-input",
  database: "text-node-database",
  automation: "text-node-automation",
  ai: "text-node-ai",
};

export function NodeConfigPanel({ node, onClose, onUpdate, onDelete }: NodeConfigPanelProps) {
  if (!node) return null;

  const data = node.data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(data.nodeType);
  const Icon = config?.icon;

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col h-full animate-slide-in-right">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`h-4 w-4 ${categoryTextColors[data.category]}`} />}
          <h3 className="font-display font-semibold text-xs">Configurar Bloco</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-2">
          <Label className="text-[11px]">Nome do Bloco</Label>
          <Input
            className="h-8 text-xs bg-muted/50"
            value={data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px]">Descrição</Label>
          <Input
            className="h-8 text-xs bg-muted/50"
            value={data.description || ""}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
          />
        </div>

        {/* Message nodes */}
        {data.category === "message" && (
          <div className="space-y-2">
            <Label className="text-[11px]">Mensagem</Label>
            <Textarea
              className="text-xs bg-muted/50 min-h-[80px]"
              placeholder="Digite a mensagem para enviar..."
              value={data.config?.message || ""}
              onChange={(e) =>
                onUpdate(node.id, { config: { ...data.config, message: e.target.value } })
              }
            />
            <p className="text-[9px] text-muted-foreground">
              Use {"{{cliente.nome}}"}, {"{{veiculo.modelo}}"} para variáveis dinâmicas
            </p>
          </div>
        )}

        {/* Logic nodes */}
        {data.category === "logic" && (
          <div className="space-y-2">
            <Label className="text-[11px]">Condição</Label>
            <Input
              className="h-8 text-xs bg-muted/50"
              placeholder="Ex: {{mensagem}} == 'sim'"
              value={data.config?.condition || ""}
              onChange={(e) =>
                onUpdate(node.id, { config: { ...data.config, condition: e.target.value } })
              }
            />
          </div>
        )}

        {/* Delay node */}
        {data.nodeType === "delay" && (
          <div className="space-y-2">
            <Label className="text-[11px]">Tempo (segundos)</Label>
            <Input
              type="number"
              className="h-8 text-xs bg-muted/50"
              value={data.config?.seconds || 5}
              onChange={(e) =>
                onUpdate(node.id, {
                  config: { ...data.config, seconds: parseInt(e.target.value) },
                })
              }
            />
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <div className="text-[10px] text-muted-foreground space-y-1">
            <p><span className="font-medium">Tipo:</span> {config?.label}</p>
            <p><span className="font-medium">Categoria:</span> {data.category}</p>
            <p><span className="font-medium">ID:</span> {node.id}</p>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover Bloco
        </Button>
      </div>
    </div>
  );
}
