

## Adicionar handles de saída por item no Menu Lista

### Problema
O nó `menu_list` não mostra handles de saída para cada item da lista no canvas. O webhook já suporta roteamento por `option-{idx}` para menu_list, mas o nó visual só tem o handle default, impossibilitando ligar cada opção a um nó diferente.

### Alteração

**`src/components/flow-builder/FlowNode.tsx`**

1. Adicionar lógica para extrair todos os itens do menu_list (flatten das seções) e renderizar um handle de saída para cada item, similar ao que já existe para `menu_buttons`
2. Incluir `menu_list` na lógica de renderização de opções com handles, mas com lógica própria pois a estrutura é `sections[].items[]` em vez de um array plano

Alterações específicas:
- Extrair itens do menu_list: `sections.flatMap(s => s.items || [])` para obter lista plana
- Renderizar cada item com seu título e um `Handle` com id `option-{idx}` (onde idx é o índice global do item, não por seção)
- Mostrar o nome da seção como separador visual antes dos itens de cada seção
- Remover o handle default de saída quando for menu_list (já tratado por não ser `isMenu` atualmente — agora incluir na condição)

### Visual esperado
```text
┌──────────────────────────┐
│ 📋 Menu Lista         ✏ ✕│
├──────────────────────────┤
│  Meu menu                │
│  ── Seção 1 ──           │
│  Item A               ●──│
│  Item B               ●──│
│  ── Seção 2 ──           │
│  Item C               ●──│
│                          │
└──────────────────────────┘
```

### Nenhuma alteração no webhook
O webhook já busca `findNextNodeId(edges, node.id, \`option-${matchIdx}\`)` para menu_list (linha 763), então a lógica de roteamento já funciona — só faltava o visual.

