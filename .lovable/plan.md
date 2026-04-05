

## Corrigir Undo/Redo (Desfazer/Refazer) no Flow Builder

### Problema
Os botões de desfazer e refazer não têm nenhuma lógica conectada — são apenas ícones visuais sem funcionalidade.

### Solução
Implementar um sistema de histórico manual que rastreia snapshots de `nodes` e `edges` a cada mudança.

### Alteração: `src/pages/FlowBuilder.tsx`

1. **Criar sistema de histórico** com `useRef`:
   - `historyRef` — array de snapshots `{ nodes, edges }`
   - `historyIndexRef` — ponteiro para posição atual no histórico
   - Limite de ~50 entradas para não consumir memória

2. **Função `pushHistory`** — chamada após cada mudança significativa (adicionar/remover nó, conectar, mover, importar):
   - Descarta entradas futuras se o índice não está no fim (após um undo)
   - Salva snapshot atual de `nodes` e `edges`

3. **Funções `handleUndo` e `handleRedo`**:
   - `handleUndo`: decrementa índice, restaura `setNodes`/`setEdges` do snapshot anterior
   - `handleRedo`: incrementa índice, restaura do snapshot seguinte

4. **Conectar aos botões existentes** (linhas 394-399):
   - Adicionar `onClick={handleUndo}` e `onClick={handleRedo}`
   - Desabilitar botões quando não há histórico disponível (`disabled`)

5. **Chamar `pushHistory`** nos pontos de mutação:
   - `onConnect`, `onDrop` (adicionar nó), delete de nó, `handleImport`, mudanças via `onNodesChange`/`onEdgesChange` (debounced para moves)

6. **Atalhos de teclado**: `Ctrl+Z` para undo, `Ctrl+Shift+Z` para redo

