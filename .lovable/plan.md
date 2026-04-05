

## Remover modal de confirmação ao excluir nó

Simplificar a exclusão de nós no Flow Builder — ao clicar no botão de excluir, o nó é removido imediatamente sem modal de confirmação.

### Alterações em `src/components/flow-builder/FlowNode.tsx`

1. **Remover estado e função do modal**: Remover `showDeleteConfirm`, `setShowDeleteConfirm`, `confirmDelete` e `handleDelete`. Substituir por um único `handleDelete` que chama `deleteElements` diretamente.

2. **Remover o bloco `<AlertDialog>`** (linhas 370-390) por completo.

3. **Remover import do AlertDialog** (linha 6) — não será mais usado.

4. **Atualizar o botão de delete** no header do nó para chamar `deleteElements` diretamente em vez de abrir o modal.

