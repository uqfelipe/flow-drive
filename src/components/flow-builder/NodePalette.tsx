import { nodeCategories, getNodesByCategory, type NodeTypeConfig } from "./nodeTypes";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeTypeConfig) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (cat: string) => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="w-72 bg-white dark:bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="font-display font-semibold text-sm mb-3 text-foreground">Componentes</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar componente..."
            className="pl-9 h-9 text-sm bg-muted/50 border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {nodeCategories.map(({ category, label, icon: CatIcon }) => {
          const nodes = getNodesByCategory(category);
          const filtered = search
            ? nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase()))
            : nodes;

          if (filtered.length === 0) return null;
          const isCollapsed = collapsed[category];

          return (
            <div key={category}>
              <button
                onClick={() => toggle(category)}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <CatIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1 text-left">
                  {label}
                </span>
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              {!isCollapsed && (
                <div className="ml-1 space-y-0.5 mt-0.5">
                  {filtered.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing
                        hover:bg-muted/60 transition-all duration-150 group"
                    >
                      <div
                        className="p-1.5 rounded-lg transition-transform group-hover:scale-110 flex-shrink-0"
                        style={{ backgroundColor: `${node.color}18`, color: node.color }}
                      >
                        <node.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground leading-tight">{node.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{node.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
