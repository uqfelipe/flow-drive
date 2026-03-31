import { nodeCategories, getNodesByCategory, type NodeTypeConfig } from "./nodeTypes";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight, GripVertical } from "lucide-react";

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeTypeConfig) => void;
}

const categoryBgColors: Record<string, string> = {
  trigger: "bg-node-trigger/10 text-node-trigger",
  message: "bg-node-message/10 text-node-message",
  logic: "bg-node-logic/10 text-node-logic",
  input: "bg-node-input/10 text-node-input",
  database: "bg-node-database/10 text-node-database",
  automation: "bg-node-automation/10 text-node-automation",
  ai: "bg-node-ai/10 text-node-ai",
};

const categoryCountColors: Record<string, string> = {
  trigger: "bg-node-trigger/15 text-node-trigger",
  message: "bg-node-message/15 text-node-message",
  logic: "bg-node-logic/15 text-node-logic",
  input: "bg-node-input/15 text-node-input",
  database: "bg-node-database/15 text-node-database",
  automation: "bg-node-automation/15 text-node-automation",
  ai: "bg-node-ai/15 text-node-ai",
};

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["trigger", "message"]));

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="w-64 bg-card/50 backdrop-blur-sm border-r border-border flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="font-display font-semibold text-xs mb-2">Blocos</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar bloco..."
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {nodeCategories.map(({ category, label, color, icon: CatIcon }) => {
          const nodes = getNodesByCategory(category);
          const filtered = search
            ? nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()))
            : nodes;

          if (filtered.length === 0) return null;

          const isOpen = openCategories.has(category) || search.length > 0;

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-all duration-200"
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <CatIcon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-[11px] font-medium">{label}</span>
                <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded-full font-medium ${categoryCountColors[category]}`}>
                  {filtered.length}
                </span>
              </button>

              {isOpen && (
                <div className="ml-2 mt-0.5 space-y-0.5">
                  {filtered.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted/80 transition-all duration-200 group border border-transparent hover:border-border"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/20 group-hover:text-muted-foreground/50" />
                      <div className={`p-1 rounded-md ${categoryBgColors[category]}`}>
                        <node.icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{node.label}</p>
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
