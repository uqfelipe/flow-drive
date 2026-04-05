

## Corrigir importação de fluxo JSON

### Problema
Ao importar um JSON, os nós podem ser sobrescritos pelo auto-load do fluxo atual (efeito na linha 132 que recarrega do DB quando `dbLoaded` muda). Além disso, os nós importados podem não ter `type: "flowNode"`, causando renderização incorreta. E se `currentFlowId` continua apontando para um fluxo existente, o save sobrescreve esse fluxo ao invés de criar um novo.

### Alteração: `src/pages/FlowBuilder.tsx` — função `handleImport`

1. **Desconectar do fluxo atual**: `setCurrentFlowId(null)` para que o "Salvar" crie um novo fluxo
2. **Marcar `dbLoaded = true`** para evitar que o useEffect de auto-load sobrescreva os nós importados
3. **Garantir `type: "flowNode"`** em todos os nós importados
4. **Atualizar `nodeIdCounter`** para evitar colisão de IDs ao adicionar novos nós
5. **Resetar histórico** com o estado importado (igual ao handleFormat)
6. **Atualizar nome e status**: usar nome do JSON, status "draft", `isActive = false`

```typescript
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
          const fixedNodes = data.nodes.map(n => ({ ...n, type: "flowNode" }));
          setNodes(fixedNodes);
          setEdges(data.edges);
          setCurrentFlowName(data.name || "Fluxo Importado");
          setCurrentFlowId(null);     // desvincula — salvar cria novo
          setDbLoaded(true);          // impede auto-reload do DB
          setCurrentFlowStatus("draft");
          setIsActive(false);
          setSelectedNode(null);
          // Atualizar counter de IDs
          const maxId = Math.max(...data.nodes.map(n => parseInt(n.id) || 0), nodeIdCounter);
          nodeIdCounter = maxId + 1;
          // Resetar histórico
          historyRef.current = [{ nodes: JSON.parse(JSON.stringify(fixedNodes)), edges: JSON.parse(JSON.stringify(data.edges)) }];
          historyIndexRef.current = 0;
          updateUndoRedoState();
          toast.success("Fluxo importado com sucesso!");
        } else {
          toast.error("Arquivo inválido.");
        }
      } catch {
        toast.error("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
};
```

