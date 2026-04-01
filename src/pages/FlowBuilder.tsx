import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow, addEdge, useNodesState, useEdgesState, Controls, Background, BackgroundVariant,
  type Connection, type Edge, type Node, ReactFlowProvider,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AdminLayout } from "@/components/AdminLayout";
import { NodePalette } from "@/components/flow-builder/NodePalette";
import { NodeConfigPanel } from "@/components/flow-builder/NodeConfigPanel";

import FlowNode from "@/components/flow-builder/FlowNode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Undo2, Redo2, Download, Save } from "lucide-react";
import type { NodeTypeConfig } from "@/components/flow-builder/nodeTypes";
import type { FlowNodeData } from "@/types";
import { useFlows, useSaveFlow } from "@/hooks/use-flows";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const customNodeTypes = { flowNode: FlowNode };

const defaultEdgeOptions = {
  type: "smoothstep",
  style: { stroke: "hsl(220 13% 80%)", strokeWidth: 2 },
  animated: false,
};

let nodeIdCounter = 100;

function FlowBuilderContent() {
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [currentFlowName, setCurrentFlowName] = useState("Novo Fluxo");
  const [currentFlowStatus, setCurrentFlowStatus] = useState<string>("draft");
  const [isActive, setIsActive] = useState(false);

  const { data: flows, isLoading } = useFlows();
  const saveFlow = useSaveFlow();

  useEffect(() => {
    if (flows && flows.length > 0 && !currentFlowId) {
      const flow = flows[0];
      setCurrentFlowId(flow.id);
      setCurrentFlowName(flow.name);
      setCurrentFlowStatus(flow.status);
      setIsActive(flow.status === "active");
      setNodes(flow.nodes as Node[]);
      setEdges(flow.edges as Edge[]);
    }
  }, [flows, currentFlowId, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges]
  );

  // Only open config panel via pencil icon (custom event), not on selection
  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) setSelectedNode(node);
    };
    window.addEventListener("flow-edit-node", handler);
    return () => window.removeEventListener("flow-edit-node", handler);
  }, [nodes]);

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
          label: parsed.label,
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
    const status = isActive ? "active" : "inactive";
    saveFlow.mutate({ id: currentFlowId, nodes, edges, name: currentFlowName, status }, {
      onSuccess: () => toast.success("Fluxo salvo!"),
      onError: () => toast.error("Erro ao salvar fluxo"),
    });
  };

  const handleExport = () => {
    const data = JSON.stringify({ nodes, edges, name: currentFlowName }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentFlowName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fluxo exportado!");
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
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-white dark:bg-card gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              className="h-8 w-48 text-sm font-display font-semibold border-transparent hover:border-border focus:border-border bg-transparent"
              value={currentFlowName}
              onChange={(e) => setCurrentFlowName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Desfazer">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Refazer">
              <Redo2 className="h-4 w-4" />
            </Button>

            <div className="h-5 w-px bg-border mx-1" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{isActive ? "Ativo" : "Inativo"}</span>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="h-5 w-px bg-border mx-1" />

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport} title="Exportar">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saveFlow.isPending}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <NodePalette onDragStart={onDragStart} />
          <div className="flex-1 relative" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect} onInit={setReactFlowInstance}
              onDrop={onDrop} onDragOver={onDragOver}
              
              nodeTypes={customNodeTypes} fitView
              className="!bg-muted/30"
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
