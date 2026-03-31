import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow, addEdge, useNodesState, useEdgesState, Controls, Background, BackgroundVariant,
  type Connection, type Edge, type Node, type OnSelectionChangeFunc, ReactFlowProvider,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AdminLayout } from "@/components/AdminLayout";
import { NodePalette } from "@/components/flow-builder/NodePalette";
import { NodeConfigPanel } from "@/components/flow-builder/NodeConfigPanel";
import FlowNode from "@/components/flow-builder/FlowNode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Workflow } from "lucide-react";
import type { NodeTypeConfig } from "@/components/flow-builder/nodeTypes";
import type { FlowNodeData } from "@/types";
import { useFlows, useSaveFlow } from "@/hooks/use-flows";
import { toast } from "sonner";

const customNodeTypes = { flowNode: FlowNode };

const defaultEdgeOptions = {
  type: "smoothstep",
  style: { stroke: "hsl(220 13% 80%)", strokeWidth: 2 },
  animated: false,
};

let nodeIdCounter = 100;

function FlowBuilderContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [currentFlowName, setCurrentFlowName] = useState("Carregando...");
  const [currentFlowStatus, setCurrentFlowStatus] = useState("draft");

  const { data: flows, isLoading } = useFlows();
  const saveFlow = useSaveFlow();

  useEffect(() => {
    if (flows && flows.length > 0 && !currentFlowId) {
      const flow = flows[0];
      setCurrentFlowId(flow.id);
      setCurrentFlowName(flow.name);
      setCurrentFlowStatus(flow.status);
      setNodes(flow.nodes as Node[]);
      setEdges(flow.edges as Edge[]);
    }
  }, [flows, currentFlowId, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges]
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: sel }) => {
    setSelectedNode(sel.length === 1 ? sel[0] : null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeData = event.dataTransfer.getData("application/reactflow");
      if (!nodeData || !reactFlowInstance) return;
      const parsed: NodeTypeConfig = JSON.parse(nodeData);
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: String(nodeIdCounter++),
        type: "flowNode",
        position,
        data: {
          label: `Grupo ${nodeIdCounter}`,
          category: parsed.category,
          nodeType: parsed.type,
          config: parsed.defaultConfig || {},
          description: parsed.description,
          blocks: [],
        } satisfies FlowNodeData,
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeType: NodeTypeConfig) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = "move";
  };

  const onUpdateNode = useCallback((id: string, update: Partial<FlowNodeData>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...update } } : n));
    setSelectedNode((prev) => prev && prev.id === id ? { ...prev, data: { ...prev.data, ...update } } : prev);
  }, [setNodes]);

  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleSave = () => {
    if (!currentFlowId) return;
    saveFlow.mutate({ id: currentFlowId, nodes, edges }, {
      onSuccess: () => toast.success("Fluxo salvo!"),
      onError: () => toast.error("Erro ao salvar fluxo"),
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Construtor de Fluxos" subtitle="Monte automações visuais para o chatbot">
        <div className="p-6"><Skeleton className="h-[500px] w-full" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Construtor de Fluxos" subtitle="Monte automações visuais para o chatbot">
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Simplified toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-border bg-white dark:bg-card">
          <div className="flex items-center gap-3">
            <Workflow className="h-4 w-4 text-blue-500 dark:text-primary" />
            <span className="font-display font-semibold text-sm text-gray-800 dark:text-foreground">{currentFlowName}</span>
            <Badge variant="outline" className={
              currentFlowStatus === "active"
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-success/10 dark:text-success dark:border-success/30 text-[10px]"
                : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-muted dark:text-muted-foreground dark:border-border text-[10px]"
            }>
              {currentFlowStatus === "active" ? "Ativo" : currentFlowStatus === "draft" ? "Rascunho" : "Inativo"}
            </Badge>
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saveFlow.isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <NodePalette onDragStart={onDragStart} />
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect} onInit={setReactFlowInstance}
              onDrop={onDrop} onDragOver={onDragOver}
              onSelectionChange={onSelectionChange}
              nodeTypes={customNodeTypes} fitView
              className="!bg-gray-50 dark:!bg-background"
              defaultEdgeOptions={defaultEdgeOptions}
              connectionLineType={ConnectionLineType.SmoothStep}
              connectionLineStyle={{ stroke: "hsl(220 80% 60%)", strokeWidth: 2 }}
            >
              <Controls className="!rounded-xl" />
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="hsl(220 13% 82%)"
                className="dark:!bg-background"
              />
            </ReactFlow>
          </div>
          {selectedNode && (
            <NodeConfigPanel node={selectedNode} onClose={() => setSelectedNode(null)} onUpdate={onUpdateNode} onDelete={onDeleteNode} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function FlowBuilder() {
  return <ReactFlowProvider><FlowBuilderContent /></ReactFlowProvider>;
}
