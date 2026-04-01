import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { getNodeTypeConfig } from "./nodeTypes";
import type { FlowNodeData } from "@/types";
import { X, GripHorizontal, Pencil } from "lucide-react";

function FlowNode({ data, selected, id }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(nodeData.nodeType);
  const Icon = config?.icon;
  const color = config?.color || "#8B5CF6";
  const menuOptions = nodeData.config?.options as string[] | undefined;
  const menuButtons = nodeData.config?.buttons as string[] | undefined;
  const messageText = nodeData.config?.message as string | undefined;
  const { deleteElements } = useReactFlow();

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const isMenu = nodeData.nodeType === "menu_text" || nodeData.nodeType === "menu_buttons";
  const options = nodeData.nodeType === "menu_text" ? menuOptions : menuButtons;

  return (
    <div
      className={`
        relative rounded-2xl bg-white dark:bg-card border-2 overflow-visible
        min-w-[260px] max-w-[320px] transition-all duration-200 cursor-pointer
        ${selected ? "shadow-lg" : "shadow-md hover:shadow-lg"}
      `}
      style={{ borderColor: selected ? color : `${color}40` }}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !border-2 !border-white dark:!border-card !rounded-full !-left-2"
        style={{ backgroundColor: color }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl"
        style={{ backgroundColor: `${color}12` }}
      >
        <GripHorizontal className="h-3.5 w-3.5 cursor-grab" style={{ color: `${color}60` }} />
        <div className="p-1 rounded-md" style={{ backgroundColor: `${color}20` }}>
          {Icon && <Icon className="h-3.5 w-3.5" style={{ color }} />}
        </div>
        <span className="text-xs font-semibold flex-1 truncate" style={{ color }}>
          {config?.label || nodeData.nodeType}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("flow-edit-node", { detail: id }));
          }}
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={handleDelete}
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Remover"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="p-2.5 space-y-1.5">
        {/* Label / description */}
        <p className="text-[11px] font-medium text-foreground px-1">{nodeData.label}</p>

        {/* Message preview */}
        {messageText && (
          <div className="px-2 py-1.5 rounded-lg bg-muted/50 text-[10px] text-muted-foreground line-clamp-2">
            {messageText}
          </div>
        )}

        {/* Description */}
        {nodeData.description && !messageText && (
          <p className="text-[10px] text-muted-foreground px-1 truncate">{nodeData.description}</p>
        )}

        {/* Menu options with individual handles */}
        {isMenu && options && options.length > 0 && (
          <div className="space-y-1 mt-1">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium relative"
                style={{ backgroundColor: `${color}10`, color }}
              >
                <span className="flex-1 truncate">{opt}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`option-${idx}`}
                  className="!w-3 !h-3 !border-2 !border-white dark:!border-card !rounded-full !-right-4 !top-auto !relative"
                  style={{ backgroundColor: color }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Condition handles */}
        {nodeData.nodeType === "condition" && (
          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 relative">
              <span className="flex-1">Sim</span>
              <Handle
                type="source"
                position={Position.Right}
                id="true"
                className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-card !rounded-full !-right-4 !top-auto !relative"
              />
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-red-50 dark:bg-red-950/30 text-red-500 relative">
              <span className="flex-1">Não</span>
              <Handle
                type="source"
                position={Position.Right}
                id="false"
                className="!w-3 !h-3 !bg-red-500 !border-2 !border-white dark:!border-card !rounded-full !-right-4 !top-auto !relative"
              />
            </div>
          </div>
        )}

        {/* Default source handle (non-menu, non-condition) */}
        {!isMenu && nodeData.nodeType !== "condition" && (
          <div className="flex justify-end pr-0">
            <Handle
              type="source"
              position={Position.Right}
              className="!w-4 !h-4 !border-2 !border-white dark:!border-card !rounded-full !-right-3"
              style={{ backgroundColor: color, top: "50%" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FlowNode);
