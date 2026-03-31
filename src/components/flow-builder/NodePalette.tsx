import { nodeCategories, getNodesByCategory, type NodeTypeConfig } from "./nodeTypes";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeTypeConfig) => void;
}

const categoryIconColors: Record<string, string> = {
  bubble: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  input: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400",
  logic: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
  integration: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
};

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const [search, setSearch] = useState("");

  return (
    <div className="w-72 bg-white dark:bg-card border-r border-gray-200 dark:border-border flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 dark:border-border">
        <h3 className="font-display font-semibold text-sm mb-3 text-gray-800 dark:text-foreground">Blocos</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-muted-foreground" />
          <Input
            placeholder="Buscar bloco..."
            className="pl-9 h-9 text-sm bg-gray-50 dark:bg-muted border-gray-200 dark:border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {nodeCategories.map(({ category, label }) => {
          const nodes = getNodesByCategory(category);
          const filtered = search
            ? nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()))
            : nodes;

          if (filtered.length === 0) return null;

          return (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-muted-foreground uppercase tracking-wider mb-2">
                {label}
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {filtered.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node)}
                    className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl cursor-grab active:cursor-grabbing
                      hover:bg-gray-50 dark:hover:bg-muted/60 transition-all duration-150
                      border border-transparent hover:border-gray-200 dark:hover:border-border group"
                  >
                    <div className={`p-2 rounded-lg ${categoryIconColors[category]} transition-transform group-hover:scale-110`}>
                      <node.icon className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-medium text-gray-700 dark:text-foreground/80 text-center leading-tight">
                      {node.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
