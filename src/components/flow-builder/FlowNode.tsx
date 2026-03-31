import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeTypeConfig } from "./nodeTypes";
import type { FlowNodeData } from "@/types";

const categoryColors: Record<string, { border: string; bg: string; text: string; bar: string }> = {
  trigger: {
    border: "border-node-trigger/40 hover:border-node-trigger",
    bg: "bg-node-trigger/10",
    text: "text-node-trigger",
    bar: "from-node-trigger to-node-trigger/60",
  },
  message: {
    border: "border-node-message/40 hover:border-node-message",
    bg: "bg-node-message/10",
    text: "text-node-message",
    bar: "from-node-message to-node-message/60",
  },
  logic: {
    border: "border-node-logic/40 hover:border-node-logic",
    bg: "bg-node-logic/10",
    text: "text-node-logic",
    bar: "from-node-logic to-node-logic/60",
  },
  input: {
    border: "border-node-input/40 hover:border-node-input",
    bg: "bg-node-input/10",
    text: "text-node-input",
    bar: "from-node-input to-node-input/60",
  },
  database: {
    border: "border-node-database/40 hover:border-node-database",
    bg: "bg-node-database/10",
    text: "text-node-database",
    bar: "from-node-database to-node-database/60",
  },
  automation: {
    border: "border-node-automation/40 hover:border-node-automation",
    bg: "bg-node-automation/10",
    text: "text-node-automation",
    bar: "from-node-automation to-node-automation/60",
  },
  ai: {
    border: "border-node-ai/40 hover:border-node-ai",
    bg: "bg-node-ai/10",
    text: "text-node-ai",
    bar: "from-node-ai to-node-ai/60",
  },
};

function FlowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(nodeData.nodeType);
  const Icon = config?.icon;
  const category = nodeData.category;
  const colors = categoryColors[category] || { border: "border-border", bg: "bg-muted", text: "text-foreground", bar: "from-primary to-primary/60" };

  return (
    <div
      className={`
        relative rounded-xl border bg-card min-w-[180px] max-w-[220px] overflow-hidden
        transition-all duration-300 cursor-pointer
        ${colors.border}
        ${selected ? "ring-2 ring-primary/40 shadow-glow scale-[1.03]" : "shadow-node hover:shadow-node-hover"}
      `}
    >
      {/* Gradient top bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${colors.bar}`} />

      {/* Input Handle */}
      {category !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground/60 !border-2 !border-card hover:!bg-primary !transition-all !duration-200"
        />
      )}

      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
          {Icon && <Icon className={`h-4 w-4 ${colors.text}`} />}
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
        className="!w-3 !h-3 !bg-muted-foreground/60 !border-2 !border-card hover:!bg-primary !transition-all !duration-200"
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
