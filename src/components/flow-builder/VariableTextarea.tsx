import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useCustomerFieldDefinitions } from "@/hooks/use-customer-fields";
import type { Node } from "@xyflow/react";
import type { FlowNodeData } from "@/types";

const SYSTEM_VARIABLES = [
  { key: "nome", label: "Nome do cliente", group: "Sistema" },
  { key: "telefone", label: "Telefone do cliente", group: "Sistema" },
  { key: "cpf", label: "CPF do cliente", group: "Sistema" },
  { key: "email", label: "Email do cliente", group: "Sistema" },
  { key: "veiculo_selecionado", label: "Veículo selecionado", group: "Sistema" },
  { key: "veiculo_nome", label: "Nome do veículo", group: "Sistema" },
  { key: "localizacao", label: "Localização capturada", group: "Sistema" },
];

interface VariableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  nodes?: Node[];
}

export function VariableTextarea({ value, onChange, placeholder, className, nodes = [] }: VariableTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [slashIndex, setSlashIndex] = useState(-1);
  const [filter, setFilter] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: fieldDefs } = useCustomerFieldDefinitions();

  const flowVariables = useMemo(() => {
    const vars: { key: string; label: string; group: string }[] = [];
    const seen = new Set<string>();
    for (const n of nodes) {
      const d = n.data as unknown as FlowNodeData;
      const varName = d?.config?.variable;
      if (varName && typeof varName === "string" && !seen.has(varName)) {
        seen.add(varName);
        vars.push({ key: varName, label: `Captura: ${varName}`, group: "Captura" });
      }
    }
    return vars;
  }, [nodes]);

  const customFieldVars = useMemo(() => {
    return (fieldDefs || []).map((f) => ({
      key: f.field_key,
      label: f.field_label,
      group: "Campos Personalizados",
    }));
  }, [fieldDefs]);

  const allVariables = useMemo(() => {
    return [...SYSTEM_VARIABLES, ...flowVariables, ...customFieldVars];
  }, [flowVariables, customFieldVars]);

  const filtered = useMemo(() => {
    if (!filter) return allVariables;
    const q = filter.toLowerCase();
    return allVariables.filter(
      (v) => v.key.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)
    );
  }, [allVariables, filter]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [filtered.length, filter]);

  const insertVariable = useCallback((varKey: string) => {
    const before = value.slice(0, slashIndex);
    const afterSlash = value.slice(slashIndex);
    const endOfSearch = afterSlash.indexOf(" ");
    const after = endOfSearch === -1 ? "" : afterSlash.slice(endOfSearch);
    const newValue = `${before}{{${varKey}}}${after}`;
    onChange(newValue);
    setShowDropdown(false);
    setFilter("");
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        const cursorPos = before.length + varKey.length + 4;
        ta.focus();
        ta.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  }, [value, slashIndex, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      insertVariable(filtered[selectedIdx]?.key || "");
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      setFilter("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newVal.slice(0, cursorPos);
    const lastSlash = textBeforeCursor.lastIndexOf("/");

    if (lastSlash !== -1) {
      const textAfterSlash = textBeforeCursor.slice(lastSlash + 1);
      if (!/\s/.test(textAfterSlash) || textAfterSlash === "") {
        setSlashIndex(lastSlash);
        setFilter(textAfterSlash);
        setShowDropdown(true);
        return;
      }
    }
    setShowDropdown(false);
    setFilter("");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as HTMLElement) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as HTMLElement)
      ) {
        setShowDropdown(false);
        setFilter("");
      }
    };
    if (showDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const v of filtered) {
      if (!groups[v.group]) groups[v.group] = [];
      groups[v.group].push(v);
    }
    return groups;
  }, [filtered]);

  let flatIdx = 0;

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 max-h-[220px] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 slide-in-from-top-1"
        >
          {Object.entries(grouped).map(([group, vars]) => (
            <div key={group}>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 sticky top-0">
                {group}
              </div>
              {vars.map((v) => {
                const idx = flatIdx++;
                return (
                  <button
                    key={v.key}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
                      idx === selectedIdx ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertVariable(v.key);
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    <code className="text-[11px] font-mono text-primary">{"{{" + v.key + "}}"}</code>
                    <span className="text-muted-foreground truncate ml-auto">{v.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
