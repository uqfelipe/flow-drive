

## Copiar e Colar componentes no Flow Builder

### O que será adicionado

Funcionalidade de copiar e colar nós no canvas do Flow Builder via:
- **Atalhos de teclado**: Ctrl+C (copiar), Ctrl+V (colar)
- **Menu de contexto** (clique direito no nó): opções "Copiar" e "Colar"
- **Duplicar**: Ctrl+D como atalho rápido para duplicar o nó selecionado

### Alteração

**`src/pages/FlowBuilder.tsx`**

1. Adicionar estado `clipboard` para armazenar nó(s) copiado(s)
2. Adicionar `onSelectionChange` no ReactFlow para rastrear nós selecionados
3. Implementar `handleCopy` — salva os nós selecionados no clipboard (dados completos)
4. Implementar `handlePaste` — cria novos nós a partir do clipboard com IDs novos e posição offset (+50px x/y)
5. Adicionar `useEffect` com listener de `keydown` para Ctrl+C, Ctrl+V, Ctrl+D
6. Ao colar múltiplos nós, preservar as edges entre eles (reconectar com novos IDs)
7. Mostrar toast de feedback: "Componente copiado", "Componente colado"

**`src/components/flow-builder/FlowNode.tsx`**

8. Adicionar botão "Copiar" (ícone Copy) na barra de ações do nó, ao lado do lápis e do X
9. O botão dispara evento customizado `flow-copy-node` com o ID do nó

### Comportamento
- Copiar um nó copia todos os seus dados (label, config, category, etc.)
- Colar posiciona o novo nó 50px abaixo e à direita do original
- Cada nó colado recebe ID único (nodeIdCounter++)
- Múltiplos pastes criam novos nós em posições incrementais
- Funciona com seleção múltipla (arrastar para selecionar vários nós)

