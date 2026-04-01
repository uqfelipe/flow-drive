import { getNodeTypeConfig } from "./nodeTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Trash2, Plus } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { FlowNodeData } from "@/types";

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

export function NodeConfigPanel({ node, onClose, onUpdate, onDelete }: NodeConfigPanelProps) {
  if (!node) return null;

  const data = node.data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(data.nodeType);
  const Icon = config?.icon;
  const color = config?.color || "#8B5CF6";

  const isMenu = data.nodeType === "menu_text" || data.nodeType === "menu_buttons";
  const optionsKey = data.nodeType === "menu_text" ? "options" : "buttons";
  const menuItems = (data.config?.[optionsKey] as string[]) || [];

  const updateMenuItems = (items: string[]) => {
    onUpdate(node.id, { config: { ...data.config, [optionsKey]: items } });
  };

  return (
    <div className="w-72 bg-white dark:bg-card border-l border-border flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-border" style={{ backgroundColor: `${color}10` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" style={{ color }} />}
            <h3 className="font-display font-semibold text-sm text-foreground">Configurar</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Nome do Grupo</Label>
          <Input
            className="h-9 text-sm"
            value={data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
          <Input
            className="h-9 text-sm"
            value={data.description || ""}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
          />
        </div>

        {/* Message config */}
        {data.category === "mensagem" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
            <Textarea
              className="text-sm min-h-[80px]"
              placeholder="Digite a mensagem..."
              value={data.config?.message || ""}
              onChange={(e) => onUpdate(node.id, { config: { ...data.config, message: e.target.value } })}
            />
            <p className="text-[10px] text-muted-foreground">
              Use {"{{variavel}}"} para valores dinâmicos
            </p>
          </div>
        )}

        {/* Menu options config */}
        {isMenu && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Opções</Label>
            <div className="space-y-1.5">
              {menuItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <Input
                    className="h-8 text-xs flex-1"
                    value={item}
                    onChange={(e) => {
                      const updated = [...menuItems];
                      updated[idx] = e.target.value;
                      updateMenuItems(updated);
                    }}
                  />
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => updateMenuItems(menuItems.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline" size="sm" className="w-full h-8 text-xs mt-1"
              onClick={() => updateMenuItems([...menuItems, `Opção ${menuItems.length + 1}`])}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar Opção
            </Button>
          </div>
        )}

        {/* Condition config */}
        {data.nodeType === "condition" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Condição</Label>
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
            <Label className="text-xs font-medium text-muted-foreground">Tempo (segundos)</Label>
            <Input
              type="number"
              className="h-9 text-sm"
              value={data.config?.seconds || 5}
              onChange={(e) => onUpdate(node.id, { config: { ...data.config, seconds: parseInt(e.target.value) } })}
            />
          </div>
        )}

        {/* Variable config */}
        {(data.category === "entrada" || data.nodeType === "set_variable") && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Nome da Variável</Label>
            <Input
              className="h-9 text-sm"
              placeholder="nome_variavel"
              value={data.config?.variable || ""}
              onChange={(e) => onUpdate(node.id, { config: { ...data.config, variable: e.target.value } })}
            />
          </div>
        )}

        {/* Webhook config */}
        {data.nodeType === "webhook" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">URL</Label>
              <Input
                className="h-9 text-sm"
                placeholder="https://..."
                value={data.config?.url || ""}
                onChange={(e) => onUpdate(node.id, { config: { ...data.config, url: e.target.value } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Método</Label>
              <Input
                className="h-9 text-sm"
                value={data.config?.method || "POST"}
                onChange={(e) => onUpdate(node.id, { config: { ...data.config, method: e.target.value } })}
              />
            </div>
          </>
        )}

        <div className="pt-3 border-t border-border">
          <div className="text-[11px] text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground/70">Tipo:</span> {config?.label}</p>
            <p><span className="font-medium text-foreground/70">Categoria:</span> {data.category}</p>
            <p><span className="font-medium text-foreground/70">ID:</span> {node.id}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-white hover:bg-destructive border-destructive/30"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover Grupo
        </Button>
      </div>
    </div>
  );
}
