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
import { ArrowLeft, Undo2, Redo2, Download, Save, Clipboard } from "lucide-react";
import type { NodeTypeConfig } from "@/components/flow-builder/nodeTypes";
import type { FlowNodeData } from "@/types";
import { useFlows, useFlow, useSaveFlow, useCreateFlow } from "@/hooks/use-flows";
import { supabase } from "@/integrations/supabase/client";
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
  const [dbLoaded, setDbLoaded] = useState(false);
  const [clipboard, setClipboard] = useState<Node[]>([]);
  const [pasteCount, setPasteCount] = useState(0);

  const { data: flows, isLoading } = useFlows();
  const { data: flowDetail } = useFlow(currentFlowId);
  const saveFlow = useSaveFlow();
  const createFlow = useCreateFlow();

  // Pick the first flow from list (or allow creation)
  useEffect(() => {
    if (flows && flows.length > 0 && !currentFlowId) {
      setCurrentFlowId(flows[0].id);
    }
  }, [flows, currentFlowId]);

  // When flow detail loads, populate canvas from DB
  useEffect(() => {
    if (flowDetail && !dbLoaded) {
      setCurrentFlowName(flowDetail.name);
      setCurrentFlowStatus(flowDetail.status);
      setIsActive(flowDetail.status === "active");

      const dbNodes = (flowDetail.nodes || []) as Node[];
      const dbEdges = (flowDetail.edges || []) as Edge[];

      if (dbNodes.length > 0) {
        // Ensure all nodes have type=flowNode
        const fixedNodes = dbNodes.map(n => ({ ...n, type: "flowNode" }));
        setNodes(fixedNodes);
        setEdges(dbEdges);
        // Update nodeIdCounter to avoid collisions
        const maxId = Math.max(...dbNodes.map(n => parseInt(n.id) || 0), nodeIdCounter);
        nodeIdCounter = maxId + 1;
      } else {
        // Empty flow — start with blank canvas
        setNodes([]);
        setEdges([]);
      }
      setDbLoaded(true);
    }
  }, [flowDetail, dbLoaded, setNodes, setEdges]);

  // Reset dbLoaded when flowId changes
  useEffect(() => {
    setDbLoaded(false);
  }, [currentFlowId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges]
  );

  // Copy/paste/duplicate logic
  const handleCopy = useCallback((targetNodes?: Node[]) => {
    const toCopy = targetNodes || nodes.filter((n) => n.selected);
    if (toCopy.length === 0) return;
    setClipboard(toCopy.map((n) => ({ ...n })));
    setPasteCount(0);
    toast.success(`${toCopy.length} componente(s) copiado(s)`);
  }, [nodes]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;
    const offset = (pasteCount + 1) * 50;
    const idMap: Record<string, string> = {};
    const newNodes = clipboard.map((n) => {
      const newId = String(nodeIdCounter++);
      idMap[n.id] = newId;
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + offset, y: n.position.y + offset },
        selected: true,
        data: { ...n.data },
      };
    });
    // Preserve internal edges between copied nodes
    const internalEdges = edges.filter(
      (e) => idMap[e.source] && idMap[e.target]
    ).map((e) => ({
      ...e,
      id: `e-${idMap[e.source]}-${idMap[e.target]}-${Date.now()}`,
      source: idMap[e.source],
      target: idMap[e.target],
    }));
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...internalEdges]);
    setPasteCount((c) => c + 1);
    toast.success(`${newNodes.length} componente(s) colado(s)`);
  }, [clipboard, pasteCount, edges, setNodes, setEdges]);

  const handleDuplicate = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    // Copy then immediately paste
    const offset = 50;
    const idMap: Record<string, string> = {};
    const newNodes = selected.map((n) => {
      const newId = String(nodeIdCounter++);
      idMap[n.id] = newId;
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + offset, y: n.position.y + offset },
        selected: true,
        data: { ...n.data },
      };
    });
    const internalEdges = edges.filter(
      (e) => idMap[e.source] && idMap[e.target]
    ).map((e) => ({
      ...e,
      id: `e-${idMap[e.source]}-${idMap[e.target]}-${Date.now()}`,
      source: idMap[e.source],
      target: idMap[e.target],
    }));
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...internalEdges]);
    toast.success(`${newNodes.length} componente(s) duplicado(s)`);
  }, [nodes, edges, setNodes, setEdges]);

  // Only open config panel via pencil icon (custom event), not on selection
  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) setSelectedNode(node);
    };
    const copyHandler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) handleCopy([node]);
    };
    window.addEventListener("flow-edit-node", handler);
    window.addEventListener("flow-copy-node", copyHandler);
    return () => {
      window.removeEventListener("flow-edit-node", handler);
      window.removeEventListener("flow-copy-node", copyHandler);
    };
  }, [nodes, handleCopy]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); handlePaste(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); handleDuplicate(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCopy, handlePaste, handleDuplicate]);

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

  const handleSave = async () => {
    const status = isActive ? "active" : "inactive";

    // If activating, deactivate all other flows first
    if (status === "active") {
      const { error: deactivateErr } = await supabase
        .from("chatbot_flows")
        .update({ status: "inactive" as any, updated_at: new Date().toISOString() })
        .neq("id", currentFlowId || "");
      if (deactivateErr) {
        console.error("Failed to deactivate other flows:", deactivateErr);
      }
    }

    if (!currentFlowId) {
      // Create new flow
      createFlow.mutate({ name: currentFlowName, nodes: nodes as any, edges: edges as any }, {
        onSuccess: (data) => {
          setCurrentFlowId(data.id);
          toast.success("Fluxo criado!");
        },
        onError: () => toast.error("Erro ao criar fluxo"),
      });
      return;
    }

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
