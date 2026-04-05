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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import FlowNode from "@/components/flow-builder/FlowNode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Undo2, Redo2, Download, Upload, Save, Clipboard, Search, X, RotateCcw } from "lucide-react";
import { getNodeTypeConfig } from "@/components/flow-builder/nodeTypes";
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showNodeSearch, setShowNodeSearch] = useState(false);
  const [nodeSearch, setNodeSearch] = useState("");
  const [showFormatConfirm, setShowFormatConfirm] = useState(false);
  const skipAutoSelectRef = useRef(false);
  const nodeSearchInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo history system
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const MAX_HISTORY = 50;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const latestNodesRef = useRef<Node[]>([]);
  const latestEdgesRef = useRef<Edge[]>([]);

  // Keep refs in sync
  useEffect(() => { latestNodesRef.current = nodes; }, [nodes]);
  useEffect(() => { latestEdgesRef.current = edges; }, [edges]);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistory = useCallback(() => {
    if (isRestoringRef.current) return;
    const hist = historyRef.current;
    const idx = historyIndexRef.current;
    historyRef.current = hist.slice(0, idx + 1);
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(latestNodesRef.current)),
      edges: JSON.parse(JSON.stringify(latestEdgesRef.current)),
    });
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    isRestoringRef.current = true;
    setNodes(JSON.parse(JSON.stringify(snapshot.nodes)));
    setEdges(JSON.parse(JSON.stringify(snapshot.edges)));
    setTimeout(() => { isRestoringRef.current = false; }, 50);
    updateUndoRedoState();
  }, [setNodes, setEdges, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    isRestoringRef.current = true;
    setNodes(JSON.parse(JSON.stringify(snapshot.nodes)));
    setEdges(JSON.parse(JSON.stringify(snapshot.edges)));
    setTimeout(() => { isRestoringRef.current = false; }, 50);
    updateUndoRedoState();
  }, [setNodes, setEdges, updateUndoRedoState]);

  // Debounced history push for drag/move changes
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePushHistory = useCallback(() => {
    if (isRestoringRef.current) return;
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => pushHistory(), 300);
  }, [pushHistory]);

  const { data: flows, isLoading } = useFlows();
  const { data: flowDetail } = useFlow(currentFlowId);
  const saveFlow = useSaveFlow();
  const createFlow = useCreateFlow();

  // Pick the first flow from list (or allow creation)
  useEffect(() => {
    if (flows && flows.length > 0 && !currentFlowId && !skipAutoSelectRef.current) {
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
      // Initialize history with loaded state
      setTimeout(() => {
        historyRef.current = [{
          nodes: JSON.parse(JSON.stringify(dbNodes.length > 0 ? dbNodes.map(n => ({ ...n, type: "flowNode" })) : [])),
          edges: JSON.parse(JSON.stringify(dbEdges)),
        }];
        historyIndexRef.current = 0;
        updateUndoRedoState();
      }, 100);
    }
  }, [flowDetail, dbLoaded, setNodes, setEdges, updateUndoRedoState]);

  // Reset dbLoaded when flowId changes
  useEffect(() => {
    setDbLoaded(false);
  }, [currentFlowId]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
      setTimeout(() => pushHistory(), 50);
    },
    [setEdges, pushHistory]
  );

  // Wrap onNodesChange / onEdgesChange to track history on structural changes
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    const hasStructural = changes.some((c: any) => c.type === 'remove' || c.type === 'add');
    const hasPosition = changes.some((c: any) => c.type === 'position' && !c.dragging);
    if (hasStructural) setTimeout(() => pushHistory(), 50);
    else if (hasPosition) schedulePushHistory();
  }, [onNodesChange, pushHistory, schedulePushHistory]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    const hasStructural = changes.some((c: any) => c.type === 'remove' || c.type === 'add');
    if (hasStructural) setTimeout(() => pushHistory(), 50);
  }, [onEdgesChange, pushHistory]);

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
    setTimeout(() => pushHistory(), 50);
  }, [clipboard, pasteCount, edges, setNodes, setEdges, pushHistory]);

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
    setTimeout(() => pushHistory(), 50);
  }, [nodes, edges, setNodes, setEdges, pushHistory]);

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
    const configUpdateHandler = (e: Event) => {
      const { nodeId, config } = (e as CustomEvent).detail;
      setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, config } } : n));
    };
    window.addEventListener("flow-edit-node", handler);
    window.addEventListener("flow-copy-node", copyHandler);
    window.addEventListener("flow-update-node-config", configUpdateHandler);
    return () => {
      window.removeEventListener("flow-edit-node", handler);
      window.removeEventListener("flow-copy-node", copyHandler);
      window.removeEventListener("flow-update-node-config", configUpdateHandler);
    };
  }, [nodes, handleCopy, setNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowNodeSearch((v) => {
          if (!v) setTimeout(() => nodeSearchInputRef.current?.focus(), 50);
          else setNodeSearch("");
          return !v;
        });
        return;
      }
      if (e.key === "Escape" && showNodeSearch) {
        setShowNodeSearch(false);
        setNodeSearch("");
        return;
      }
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") { e.preventDefault(); handleRedo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); handlePaste(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); handleDuplicate(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCopy, handlePaste, handleDuplicate, handleUndo, handleRedo, showNodeSearch]);

  const filteredSearchNodes = nodes.filter((n) =>
    nodeSearch.trim() && (n.data as FlowNodeData)?.label?.toLowerCase().includes(nodeSearch.toLowerCase())
  ).slice(0, 5);

  const navigateToNode = useCallback((node: Node) => {
    if (!reactFlowInstance) return;
    reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.5, duration: 600 });
    // Highlight node in red without opening config
    setNodes((nds) => nds.map((n) => ({
      ...n,
      selected: n.id === node.id,
      data: { ...n.data, _highlight: n.id === node.id },
    })));
    setShowNodeSearch(false);
    setNodeSearch("");
    // Remove highlight after 3 seconds
    setTimeout(() => {
      setNodes((nds) => nds.map((n) => ({
        ...n,
        data: { ...n.data, _highlight: false },
      })));
    }, 3000);
  }, [reactFlowInstance, setNodes]);

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
      setTimeout(() => pushHistory(), 50);
    },
    [reactFlowInstance, setNodes, pushHistory]
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
    setTimeout(() => pushHistory(), 50);
  }, [setNodes, setEdges, pushHistory]);

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

  const handleFormat = () => {
    setShowFormatConfirm(true);
  };

  const executeFormat = () => {
    skipAutoSelectRef.current = true;
    setNodes([]);
    setEdges([]);
    setCurrentFlowName("Novo Fluxo");
    setCurrentFlowId(null);
    setCurrentFlowStatus("draft");
    setIsActive(false);
    setSelectedNode(null);
    setShowNodeSearch(false);
    setNodeSearch("");
    setDbLoaded(true);
    historyRef.current = [{ nodes: [], edges: [] }];
    historyIndexRef.current = 0;
    updateUndoRedoState();
    toast.success("Canvas formatado");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
            if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
              skipAutoSelectRef.current = true;
              const fixedNodes = data.nodes.map((n: any) => ({ ...n, type: "flowNode" }));
              setNodes(fixedNodes);
              setEdges(data.edges);
              setCurrentFlowName(data.name || "Fluxo Importado");
              setCurrentFlowId(null);
              setDbLoaded(true);
              setCurrentFlowStatus("draft");
              setIsActive(false);
              setSelectedNode(null);
              setShowNodeSearch(false);
              setNodeSearch("");
              const maxId = Math.max(...data.nodes.map((n: any) => parseInt(n.id) || 0), nodeIdCounter);
              nodeIdCounter = maxId + 1;
              historyRef.current = [{ nodes: JSON.parse(JSON.stringify(fixedNodes)), edges: JSON.parse(JSON.stringify(data.edges)) }];
              historyIndexRef.current = 0;
              updateUndoRedoState();
              toast.success("Fluxo importado com sucesso!");
            } else {
            toast.error("Arquivo inválido: estrutura de nós/edges não encontrada.");
          }
        } catch {
          toast.error("Erro ao ler o arquivo JSON.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Desfazer (Ctrl+Z)" onClick={handleUndo} disabled={!canUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Refazer (Ctrl+Shift+Z)" onClick={handleRedo} disabled={!canRedo}>
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

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowNodeSearch((v) => !v); setTimeout(() => nodeSearchInputRef.current?.focus(), 50); }} title="Buscar nó (Ctrl+F)">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleImport} title="Importar">
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport} title="Exportar">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleFormat} title="Formatar">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saveFlow.isPending}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <NodePalette onDragStart={onDragStart} />
          <div
            className="flex-1 relative"
            ref={reactFlowWrapper}
            onContextMenu={(e) => {
              // Only show custom context menu on canvas (not on nodes)
              const target = e.target as HTMLElement;
              if (target.closest('.react-flow__node')) return;
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }}
            onClick={() => setContextMenu(null)}
          >
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange}
              onConnect={onConnect} onInit={setReactFlowInstance}
              onDrop={onDrop} onDragOver={onDragOver}
              
              nodeTypes={customNodeTypes} fitView
              minZoom={0.05} maxZoom={4}
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

            {/* Context menu (right-click) */}
            {contextMenu && (
              <div
                className="fixed z-50 min-w-[160px] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  disabled={clipboard.length === 0}
                  onClick={() => {
                    handlePaste();
                    setContextMenu(null);
                  }}
                >
                  <Clipboard className="h-4 w-4" />
                  Colar {clipboard.length > 0 ? `(${clipboard.length})` : ""}
                </button>
              </div>
            )}

            {/* Node search overlay */}
            {showNodeSearch && (
              <div className="absolute top-4 right-4 z-50 w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 slide-in-from-top-2">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    ref={nodeSearchInputRef}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="Buscar componente..."
                    value={nodeSearch}
                    onChange={(e) => setNodeSearch(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="p-0.5 rounded hover:bg-accent transition-colors"
                    onClick={() => { setShowNodeSearch(false); setNodeSearch(""); }}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                {nodeSearch.trim() && (
                  <div className="max-h-[200px] overflow-y-auto py-1">
                    {filteredSearchNodes.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhum nó encontrado</p>
                    ) : (
                      filteredSearchNodes.map((node) => {
                        const data = node.data as FlowNodeData;
                        const config = getNodeTypeConfig(data.nodeType);
                        const Icon = config?.icon;
                        return (
                          <button
                            key={node.id}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => navigateToNode(node)}
                          >
                            {Icon && (
                              <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}20` }}>
                                <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                              </div>
                            )}
                            <span className="truncate">{data.label}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">#{node.id}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
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
