import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeTypeConfig } from "./nodeTypes";
import type { FlowNodeData } from "@/types";

const categoryBorderColors: Record<string, string> = {
  trigger: "border-node-trigger/50 hover:border-node-trigger shadow-node-trigger/5",
  message: "border-node-message/50 hover:border-node-message shadow-node-message/5",
  logic: "border-node-logic/50 hover:border-node-logic shadow-node-logic/5",
  input: "border-node-input/50 hover:border-node-input shadow-node-input/5",
  database: "border-node-database/50 hover:border-node-database shadow-node-database/5",
  automation: "border-node-automation/50 hover:border-node-automation shadow-node-automation/5",
  ai: "border-node-ai/50 hover:border-node-ai shadow-node-ai/5",
};

const categoryBgColors: Record<string, string> = {
  trigger: "bg-node-trigger/10",
  message: "bg-node-message/10",
  logic: "bg-node-logic/10",
  input: "bg-node-input/10",
  database: "bg-node-database/10",
  automation: "bg-node-automation/10",
  ai: "bg-node-ai/10",
};

const categoryTextColors: Record<string, string> = {
  trigger: "text-node-trigger",
  message: "text-node-message",
  logic: "text-node-logic",
  input: "text-node-input",
  database: "text-node-database",
  automation: "text-node-automation",
  ai: "text-node-ai",
};

function FlowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(nodeData.nodeType);
  const Icon = config?.icon;
  const category = nodeData.category;

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border-2 bg-card min-w-[180px] max-w-[220px]
        transition-all duration-200 cursor-pointer
        ${categoryBorderColors[category] || "border-border"}
        ${selected ? "ring-2 ring-primary/50 scale-105" : ""}
        shadow-lg hover:shadow-xl
      `}
    >
      {/* Input Handle */}
      {category !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-card hover:!bg-primary transition-colors"
        />
      )}

      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${categoryBgColors[category]}`}>
          {Icon && <Icon className={`h-4 w-4 ${categoryTextColors[category]}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{nodeData.label}</p>
          {nodeData.description && (
            <p className="text-[9px] text-muted-foreground truncate mt-0.5">
              {nodeData.description}
            </p>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-card hover:!bg-primary transition-colors"
      />

      {/* Extra handles for logic nodes */}
      {(nodeData.nodeType === "if_else") && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-3 !h-3 !bg-destructive !border-2 !border-card"
          />
          <div className="absolute -right-1 top-1/2 translate-x-full -translate-y-1/2 text-[8px] text-destructive font-medium ml-1">
            Não
          </div>
        </>
      )}
    </div>
  );
}

export default memo(FlowNode);
