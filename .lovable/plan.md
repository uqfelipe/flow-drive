

## Adicionar controles de zoom no Flow Builder

### O que muda
O React Flow já renderiza o componente `<Controls />` (linha 378) que inclui botões de zoom +/- e fit view. Porém, por padrão o zoom mínimo é limitado a `0.5`. A alteração é simples:

### Alteração

#### `src/pages/FlowBuilder.tsx`
- Adicionar as props `minZoom` e `maxZoom` no `<ReactFlow>`:
  - `minZoom={0.05}` — permite zoom out extremo até os nós praticamente sumirem
  - `maxZoom={4}` — zoom in generoso para edição detalhada
- O componente `<Controls>` já existente continuará funcionando normalmente com os novos limites

### Resultado
O usuário pode usar scroll do mouse ou os botões +/- para fazer zoom até o mínimo (nós quase invisíveis) ou máximo (bem ampliado), conforme preferir.

