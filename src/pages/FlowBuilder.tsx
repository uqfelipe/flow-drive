import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeFunc,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AdminLayout } from "@/components/AdminLayout";
import { NodePalette } from "@/components/flow-builder/NodePalette";
import { NodeConfigPanel } from "@/components/flow-builder/NodeConfigPanel";
import FlowNode from "@/components/flow-builder/FlowNode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Play,
  Copy,
  ToggleLeft,
  ChevronDown,
  Workflow,
} from "lucide-react";
import type { NodeTypeConfig } from "@/components/flow-builder/nodeTypes";
import type { FlowNodeData } from "@/types";

const customNodeTypes = {
  flowNode: FlowNode,
};

// Initial demo flow
const initialNodes: Node[] = [
  {
    id: "1",
    type: "flowNode",
    position: { x: 250, y: 50 },
    data: {
      label: "Mensagem Recebida",
      category: "trigger",
      nodeType: "message_received",
      config: {},
      description: "Início do fluxo",
    } satisfies FlowNodeData,
  },
  {
    id: "2",
    type: "flowNode",
    position: { x: 250, y: 180 },
    data: {
      label: "Enviar Menu",
      category: "message",
      nodeType: "send_options",
      config: { message: "Olá! Como posso ajudar?\n1. Ver carros\n2. Fazer reserva\n3. Falar com atendente" },
      description: "Menu principal",
    } satisfies FlowNodeData,
  },
  {
    id: "3",
    type: "flowNode",
    position: { x: 250, y: 320 },
    data: {
      label: "Aguardar Resposta",
      category: "automation",
      nodeType: "wait_response",
      config: {},
      description: "Espera resposta do cliente",
    } satisfies FlowNodeData,
  },
  {
    id: "4",
    type: "flowNode",
    position: { x: 250, y: 460 },
    data: {
      label: "Verificar Opção",
      category: "logic",
      nodeType: "if_else",
      config: { condition: "{{resposta}} == '1'" },
      description: "Verifica escolha do cliente",
    } satisfies FlowNodeData,
  },
  {
    id: "5",
    type: "flowNode",
    position: { x: 100, y: 600 },
    data: {
      label: "Buscar Veículos",
      category: "database",
      nodeType: "search_vehicles",
      config: {},
      description: "Busca carros disponíveis",
    } satisfies FlowNodeData,
  },
  {
    id: "6",
    type: "flowNode",
    position: { x: 400, y: 600 },
    data: {
      label: "Transferir Humano",
      category: "automation",
      nodeType: "transfer_human",
      config: {},
      description: "Redireciona para atendente",
    } satisfies FlowNodeData,
  },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true, style: { stroke: "hsl(217 91% 60%)", strokeWidth: 2 } },
  { id: "e2-3", source: "2", target: "3", animated: true, style: { stroke: "hsl(217 91% 60%)", strokeWidth: 2 } },
  { id: "e3-4", source: "3", target: "4", animated: true, style: { stroke: "hsl(217 91% 60%)", strokeWidth: 2 } },
  { id: "e4-5", source: "4", target: "5", animated: true, style: { stroke: "hsl(142 71% 45%)", strokeWidth: 2 } },
  { id: "e4-6", source: "4", sourceHandle: "false", target: "6", style: { stroke: "hsl(0 72% 51%)", strokeWidth: 2 } },
];

let nodeId = 7;

function FlowBuilderContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: "hsl(217 91% 60%)", strokeWidth: 2 } },
          eds
        )
      ),
    [setEdges]
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: selectedNodes }) => {
    if (selectedNodes.length === 1) {
      setSelectedNode(selectedNodes[0]);
    } else {
      setSelectedNode(null);
    }
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
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: String(nodeId++),
        type: "flowNode",
        position,
        data: {
          label: parsed.label,
          category: parsed.category,
          nodeType: parsed.type,
          config: parsed.defaultConfig || {},
          description: parsed.description,
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

  const onUpdateNode = useCallback(
    (nodeId: string, update: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return { ...n, data: { ...n.data, ...update } };
          }
          return n;
        })
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...update } } : prev
      );
    },
    [setNodes]
  );

  const onDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  return (
    <AdminLayout title="Construtor de Fluxos" subtitle="Monte automações visuais para o chatbot">
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-3">
            <Workflow className="h-4 w-4 text-primary" />
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm">Atendimento Inicial</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
              Ativo
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Play className="h-3 w-3 mr-1" /> Testar
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Copy className="h-3 w-3 mr-1" /> Duplicar
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <ToggleLeft className="h-3 w-3 mr-1" /> Ativar/Desativar
            </Button>
            <Button size="sm" className="h-7 text-xs">
              <Save className="h-3 w-3 mr-1" /> Salvar
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex flex-1 overflow-hidden">
          <NodePalette onDragStart={onDragStart} />

          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onSelectionChange={onSelectionChange}
              nodeTypes={customNodeTypes}
              fitView
              className="bg-background"
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: "hsl(217 91% 60%)", strokeWidth: 2 },
              }}
            >
              <Controls className="!bg-card !border-border !rounded-lg !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
              <MiniMap
                className="!bg-card !border-border !rounded-lg"
                nodeColor="hsl(217 91% 60%)"
                maskColor="hsl(220 20% 14% / 0.8)"
              />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(220 10% 25%)" />
            </ReactFlow>
          </div>

          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onUpdate={onUpdateNode}
              onDelete={onDeleteNode}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function FlowBuilder() {
  return (
    <ReactFlowProvider>
      <FlowBuilderContent />
    </ReactFlowProvider>
  );
}
