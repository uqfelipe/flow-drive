

## Adicionar botão "Limpar Canvas" no Flow Builder

### O que faz
Adiciona um botão na toolbar para deletar todos os nós e edges do canvas atual, permitindo iniciar um novo fluxo do zero. Exibe confirmação antes de apagar.

### Alteração: `src/pages/FlowBuilder.tsx`

1. **Importar ícone** `Trash2` do `lucide-react`
2. **Criar função `handleClearCanvas`**:
   - Abre um `window.confirm("Tem certeza que deseja limpar todo o canvas? Esta ação não pode ser desfeita.")`
   - Se confirmado: `setNodes([])`, `setEdges([])`, `pushHistory()`, `toast.success("Canvas limpo")`
   - Reseta o nome para "Novo Fluxo" e `currentFlowId` para `null` (desvincula do fluxo salvo)
3. **Adicionar botão na toolbar** (ao lado do botão de importar):
   - Ícone `Trash2`, variant ghost, size icon, title "Limpar canvas"
   - `onClick={handleClearCanvas}`

