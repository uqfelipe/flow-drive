import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { getNodeTypeConfig } from "./nodeTypes";
import type { FlowNodeData } from "@/types";
import { X, GripHorizontal, Pencil, Mic, Image, Video, File, Sticker, Copy, Car, Scissors } from "lucide-react";


function FlowNode({ data, selected, id }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = getNodeTypeConfig(nodeData.nodeType);
  const Icon = config?.icon;
  const color = config?.color || "#8B5CF6";
  const menuOptions = nodeData.config?.options as string[] | undefined;
  const menuButtons = nodeData.config?.buttons as Array<string | { text: string; type: string }> | undefined;
  const messageText = nodeData.config?.message as string | undefined;
  const mediaFile = nodeData.config?.file as string | undefined;
  const isAudioNode = nodeData.nodeType === "send_audio";
  const hasAudio = isAudioNode && !!mediaFile;

  const mediaNodeConfig: Record<string, { icon: typeof Image; configured: string; empty: string; color: string }> = {
    send_image: { icon: Image, configured: "Imagem anexada", empty: "Sem imagem", color: "#10B981" },
    send_video: { icon: Video, configured: "Vídeo anexado", empty: "Sem vídeo", color: "#EF4444" },
    send_file: { icon: File, configured: "Arquivo anexado", empty: "Sem arquivo", color: "#6366F1" },
    send_sticker: { icon: Sticker, configured: "Figurinha anexada", empty: "Sem figurinha", color: "#A855F7" },
  };
  const mediaConfig = mediaNodeConfig[nodeData.nodeType];
  const isMediaNode = !!mediaConfig;
  const hasFile = isMediaNode && !!mediaFile;
  const { deleteElements, getEdges } = useReactFlow();

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const handleDisconnect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const connectedEdges = getEdges().filter((edge) => edge.source === id || edge.target === id);
    if (connectedEdges.length > 0) {
      deleteElements({ edges: connectedEdges.map((edge) => ({ id: edge.id })) });
    }
  }, [id, deleteElements, getEdges]);

  const isMenu = nodeData.nodeType === "menu_text" || nodeData.nodeType === "menu_buttons";
  
  const isMenuList = nodeData.nodeType === "menu_list";
  const options = nodeData.nodeType === "menu_text" ? menuOptions : menuButtons;

  // Flatten menu_list sections into items with section headers
  const menuListSections = (nodeData.config?.sections || []) as Array<{ title: string; items?: Array<{ title: string; id?: string; description?: string }> }>;
  const menuListItems: Array<{ type: "section"; title: string } | { type: "item"; title: string; globalIdx: number }> = [];
  let globalIdx = 0;
  for (const s of menuListSections) {
    menuListItems.push({ type: "section", title: s.title });
    for (const it of (s.items || [])) {
      menuListItems.push({ type: "item", title: it.title, globalIdx });
      globalIdx++;
    }
  }

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
          onClick={handleDisconnect}
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Desconectar"
        >
          <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("flow-copy-node", { detail: id }));
          }}
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Copiar"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
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

        {/* Restart with typing preview */}
        {nodeData.nodeType === "restart_with_typing" && (
          <div className="px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
            ⏱ Inatividade: {(nodeData.config?.timeoutMinutes as number) || 30}min → Digitando {(nodeData.config?.seconds as number) || 3}s → próximo nó
          </div>
        )}

        {/* Description */}
        {nodeData.description && !messageText && !isAudioNode && !isMediaNode && nodeData.nodeType !== "restart_with_typing" && (
          <p className="text-[10px] text-muted-foreground px-1 truncate">{nodeData.description}</p>
        )}

        {/* Audio voice message indicator */}
        {isAudioNode && (
          <div
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${
              hasAudio
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : "bg-amber-50 dark:bg-amber-950/30"
            }`}
          >
            <Mic
              className="h-3.5 w-3.5 flex-shrink-0"
              style={{ color: hasAudio ? "#10B981" : "#F59E0B" }}
            />
            {/* Waveform bars */}
            <div className="flex items-center gap-[2px]">
              {[3, 5, 8, 5, 7, 4, 6, 8, 5, 3].map((h, i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 2,
                    height: h,
                    backgroundColor: hasAudio ? "#10B981" : "#F59E0B",
                    opacity: hasAudio ? 0.7 : 0.4,
                    animation: hasAudio ? `pulse 1.5s ease-in-out ${i * 0.1}s infinite` : "none",
                  }}
                />
              ))}
            </div>
            <span
              className="text-[10px] font-medium flex-1"
              style={{ color: hasAudio ? "#10B981" : "#F59E0B" }}
            >
              {hasAudio ? "Mensagem de voz" : "Sem áudio"}
            </span>
          </div>
        )}

        {/* Vehicle carousel indicator */}
        {nodeData.nodeType === "vehicle_carousel" && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <Car className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 block truncate">
                {messageText || "Carrossel de veículos"}
              </span>
              <span className="text-[9px] text-muted-foreground">
                Máx. {(nodeData.config?.maxCards as number) || 10} cards
                {(nodeData.config?.category as string) ? ` • ${nodeData.config?.category}` : " • Todas categorias"}
              </span>
            </div>
          </div>
        )}

        {/* Media file indicator (image, video, file, sticker) */}
        {isMediaNode && (() => {
          const MediaIcon = mediaConfig.icon;
          const activeColor = hasFile ? "#10B981" : mediaConfig.color;
          return (
            <div
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${
                hasFile
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : "bg-muted/50"
              }`}
            >
              <MediaIcon
                className="h-3.5 w-3.5 flex-shrink-0"
                style={{ color: activeColor }}
              />
              <span
                className="text-[10px] font-medium flex-1"
                style={{ color: activeColor, opacity: hasFile ? 1 : 0.7 }}
              >
                {hasFile ? mediaConfig.configured : mediaConfig.empty}
              </span>
            </div>
          );
        })()}

        {isMenu && options && options.length > 0 && (
          <div className="space-y-1 mt-1">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium relative"
                style={{ backgroundColor: `${color}10`, color }}
              >
                <span className="flex-1 truncate">{typeof opt === "object" ? opt.text : opt}</span>
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


        {/* Menu List items with section headers */}
        {isMenuList && menuListItems.length > 0 && (
          <div className="space-y-1 mt-1">
            {menuListItems.map((entry, idx) =>
              entry.type === "section" ? (
                <div key={`s-${idx}`} className="flex items-center gap-1.5 px-2 py-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {entry.title}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              ) : (
                <div
                  key={`i-${entry.globalIdx}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium relative"
                  style={{ backgroundColor: `${color}10`, color }}
                >
                  <span className="flex-1 truncate">{entry.title}</span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`option-${entry.globalIdx}`}
                    className="!w-3 !h-3 !border-2 !border-white dark:!border-card !rounded-full !-right-4 !top-auto !relative"
                    style={{ backgroundColor: color }}
                  />
                </div>
              )
            )}
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

        {/* Vehicle carousel per-vehicle handles */}
        {nodeData.nodeType === "vehicle_carousel" && (() => {
          const vehicles = (nodeData.config?.vehicles || []) as Array<{ id: string; name: string; brand: string; model: string; image: string }>;
          if (vehicles.length > 0) {
            return (
              <div className="space-y-1 mt-1">
                {vehicles.map((v, idx) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-600 relative"
                  >
                    {v.image && <img src={v.image} alt="" className="w-6 h-4 rounded object-cover flex-shrink-0" />}
                    <span className="flex-1 truncate">{v.name} - {v.brand}</span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={`vehicle-${idx}`}
                      className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-card !rounded-full !-right-4 !top-auto !relative"
                    />
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div className="space-y-1 mt-1">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-600 relative">
                <Car className="h-3 w-3" />
                <span className="flex-1">Veículo selecionado</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="selected"
                  className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-card !rounded-full !-right-4 !top-auto !relative"
                />
              </div>
            </div>
          );
        })()}

        {/* Default source handle (non-menu, non-condition, non-menu_list, non-vehicle_carousel) */}
        {!isMenu && !isMenuList && nodeData.nodeType !== "condition" && nodeData.nodeType !== "vehicle_carousel" && (
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
