import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow, addEdge, useNodesState, useEdgesState, Controls, Background, BackgroundVariant,
  MiniMap, type Connection, type Edge, type Node, type OnSelectionChangeFunc, ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AdminLayout } from "@/components/AdminLayout";
import { NodePalette } from "@/components/flow-builder/NodePalette";
import { NodeConfigPanel } from "@/components/flow-builder/NodeConfigPanel";
import FlowNode from "@/components/flow-builder/FlowNode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Play, Copy, ToggleLeft, ChevronDown, Workflow } from "lucide-react";
import type { NodeTypeConfig } from "@/components/flow-builder/nodeTypes";
import type { FlowNodeData } from "@/types";
import { useFlows, useSaveFlow } from "@/hooks/use-flows";
import { toast } from "sonner";

const customNodeTypes = { flowNode: FlowNode };
const edgeStyle = { stroke: "hsl(265 89% 78%)", strokeWidth: 2 };

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

  // Load first flow
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
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: edgeStyle }, eds)),
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
        data: { label: parsed.label, category: parsed.category, nodeType: parsed.type, config: parsed.defaultConfig || {}, description: parsed.description } satisfies FlowNodeData,
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
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Workflow className="h-4 w-4 text-primary" />
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm">{currentFlowName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Badge variant="outline" className={currentFlowStatus === "active" ? "bg-success/10 text-success border-success/30 text-[10px]" : "bg-muted text-muted-foreground border-border text-[10px]"}>
              {currentFlowStatus === "active" ? "Ativo" : currentFlowStatus === "draft" ? "Rascunho" : "Inativo"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs"><Play className="h-3 w-3 mr-1" /> Testar</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs"><Copy className="h-3 w-3 mr-1" /> Duplicar</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs"><ToggleLeft className="h-3 w-3 mr-1" /> Ativar/Desativar</Button>
            <Button size="sm" className="h-7 text-xs shadow-glow-sm" onClick={handleSave} disabled={saveFlow.isPending}>
              <Save className="h-3 w-3 mr-1" /> Salvar
            </Button>
          </div>
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
              nodeTypes={customNodeTypes} fitView className="bg-background"
              defaultEdgeOptions={{ animated: true, style: edgeStyle }}
            >
              <Controls />
              <MiniMap nodeColor="hsl(265 89% 78%)" maskColor="hsl(232 14% 15% / 0.7)" />
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
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
