import { nodeTypes } from "./nodeTypes";

export function FlowLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-10 bg-white dark:bg-card border border-border rounded-xl shadow-lg p-3 max-w-[320px]">
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Legenda</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {nodeTypes.map((node) => (
          <div key={node.type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: node.color }} />
            <span className="text-[10px] text-foreground/80 truncate">{node.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
