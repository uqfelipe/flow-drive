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

const categoryColors: Record<string, { headerBg: string; text: string }> = {
  bubble: { headerBg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400" },
  input: { headerBg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-600 dark:text-orange-400" },
  logic: { headerBg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-600 dark:text-purple-400" },
  integration: { headerBg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400" },
};

export function NodeConfigPanel({ node, onClose, onUpdate, onDelete }: NodeConfigPanelProps) {
  if (!node) return null;

  const data = node.data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(data.nodeType);
  const Icon = config?.icon;
  const colors = categoryColors[data.category] || categoryColors.bubble;

  return (
    <div className="w-72 bg-white dark:bg-card border-l border-gray-200 dark:border-border flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className={`p-4 border-b border-gray-100 dark:border-border ${colors.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`h-4 w-4 ${colors.text}`} />}
            <h3 className="font-display font-semibold text-sm text-gray-800 dark:text-foreground">Configurar</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600 dark:text-muted-foreground">Nome do Grupo</Label>
          <Input
            className="h-9 text-sm"
            value={data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600 dark:text-muted-foreground">Descrição</Label>
          <Input
            className="h-9 text-sm"
            value={data.description || ""}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
          />
        </div>

        {/* Message config */}
        {data.category === "bubble" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 dark:text-muted-foreground">Mensagem</Label>
            <Textarea
              className="text-sm min-h-[80px]"
              placeholder="Digite a mensagem..."
              value={data.config?.message || ""}
              onChange={(e) => onUpdate(node.id, { config: { ...data.config, message: e.target.value } })}
            />
            <p className="text-[10px] text-gray-400 dark:text-muted-foreground">
              Use {"{{variavel}}"} para valores dinâmicos
            </p>
          </div>
        )}

        {/* Logic config */}
        {data.category === "logic" && data.nodeType !== "delay" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 dark:text-muted-foreground">Condição</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Ex: {{variavel}} == 'valor'"
              value={data.config?.condition || ""}
              onChange={(e) => onUpdate(node.id, { config: { ...data.config, condition: e.target.value } })}
            />
          </div>
        )}

        {/* Delay config */}
        {data.nodeType === "delay" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 dark:text-muted-foreground">Tempo (segundos)</Label>
            <Input
              type="number"
              className="h-9 text-sm"
              value={data.config?.seconds || 5}
              onChange={(e) => onUpdate(node.id, { config: { ...data.config, seconds: parseInt(e.target.value) } })}
            />
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 dark:border-border">
          <div className="text-[11px] text-gray-400 dark:text-muted-foreground space-y-1">
            <p><span className="font-medium text-gray-500 dark:text-foreground/70">Tipo:</span> {config?.label}</p>
            <p><span className="font-medium text-gray-500 dark:text-foreground/70">Categoria:</span> {data.category}</p>
            <p><span className="font-medium text-gray-500 dark:text-foreground/70">ID:</span> {node.id}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-red-500 hover:text-white hover:bg-red-500 border-red-200 dark:border-destructive/30 dark:text-destructive"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover Grupo
        </Button>
      </div>
    </div>
  );
}
