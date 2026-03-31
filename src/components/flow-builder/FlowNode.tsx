import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeTypeConfig } from "./nodeTypes";
import type { FlowNodeData, FlowBlock } from "@/types";
import { Plus, GripHorizontal } from "lucide-react";

const categoryColors: Record<string, { bg: string; text: string; iconBg: string }> = {
  bubble: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-100 dark:bg-blue-900/50" },
  input: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-600 dark:text-orange-400", iconBg: "bg-orange-100 dark:bg-orange-900/50" },
  logic: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-600 dark:text-purple-400", iconBg: "bg-purple-100 dark:bg-purple-900/50" },
  integration: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-900/50" },
};

function FlowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(nodeData.nodeType);
  const Icon = config?.icon;
  const category = nodeData.category;
  const colors = categoryColors[category] || categoryColors.bubble;
  const blocks = nodeData.blocks || [];

  return (
    <div
      className={`
        relative rounded-2xl bg-white dark:bg-card border border-gray-200 dark:border-border
        min-w-[260px] max-w-[320px] overflow-visible
        transition-all duration-200 cursor-pointer
        ${selected ? "ring-2 ring-blue-400 dark:ring-primary shadow-lg" : "shadow-md hover:shadow-lg"}
      `}
    >
      {/* Target Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-blue-500 dark:!bg-primary !border-2 !border-white dark:!border-card !rounded-full !-left-2"
      />

      {/* Group Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-border/50">
        <GripHorizontal className="h-3.5 w-3.5 text-gray-300 dark:text-muted-foreground/40 cursor-grab" />
        <span className="text-sm font-medium text-gray-800 dark:text-foreground flex-1 truncate">
          {nodeData.label}
        </span>
      </div>

      {/* Main Block */}
      <div className="p-2">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${colors.bg} transition-colors`}>
          <div className={`p-1.5 rounded-lg ${colors.iconBg}`}>
            {Icon && <Icon className={`h-4 w-4 ${colors.text}`} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${colors.text}`}>{config?.label || nodeData.nodeType}</p>
            {nodeData.description && (
              <p className="text-[10px] text-gray-500 dark:text-muted-foreground truncate mt-0.5">
                {nodeData.description}
              </p>
            )}
          </div>
          {/* Source Handle for this block */}
          <Handle
            type="source"
            position={Position.Right}
            className="!w-4 !h-4 !bg-blue-500 dark:!bg-primary !border-2 !border-white dark:!border-card !rounded-full !-right-4 !top-auto !relative"
            style={{ right: '-16px' }}
          />
        </div>

        {/* Additional blocks */}
        {blocks.map((block, index) => {
          const blockConfig = getNodeTypeConfig(block.type);
          const BlockIcon = blockConfig?.icon;
          const blockColors = categoryColors[block.category] || categoryColors.bubble;

          return (
            <div key={block.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mt-1 ${blockColors.bg} transition-colors`}>
              <div className={`p-1.5 rounded-lg ${blockColors.iconBg}`}>
                {BlockIcon && <BlockIcon className={`h-4 w-4 ${blockColors.text}`} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${blockColors.text}`}>{block.label}</p>
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={`block-${block.id}`}
                className="!w-4 !h-4 !bg-blue-500 dark:!bg-primary !border-2 !border-white dark:!border-card !rounded-full !-right-4 !top-auto !relative"
                style={{ right: '-16px' }}
              />
            </div>
          );
        })}
      </div>

      {/* Condition handles */}
      {nodeData.nodeType === "if_else" && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-white dark:!border-card !rounded-full"
            style={{ top: '60%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-4 !h-4 !bg-red-500 !border-2 !border-white dark:!border-card !rounded-full"
            style={{ top: '80%' }}
          />
          <div className="absolute right-0 translate-x-full text-[9px] font-medium" style={{ top: '60%', transform: 'translateX(100%) translateY(-50%)' }}>
            <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">Sim</span>
          </div>
          <div className="absolute right-0 translate-x-full text-[9px] font-medium" style={{ top: '80%', transform: 'translateX(100%) translateY(-50%)' }}>
            <span className="text-red-500 dark:text-red-400 ml-1.5">Não</span>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(FlowNode);
