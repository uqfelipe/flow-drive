

## Arrumar lógica do carrossel de veículos

### O que muda
Simplificar a configuração: remover o campo "Máximo de cards" (limite de 10) e o auto-load automático. O usuário simplesmente clica "Buscar veículos", escolhe os que quer com checkboxes, e pronto.

### Alterações

#### 1. `src/components/flow-builder/NodeConfigPanel.tsx`
- Remover o campo "Máximo de cards" (input de número mín 2 / máx 10)
- Remover a validação de `maxCards` no `toggleVehicle` — o usuário pode selecionar quantos quiser
- Manter todo o resto: busca, checkboxes, filtro por categoria

#### 2. `src/components/flow-builder/FlowNode.tsx`
- Remover o `useEffect` de auto-load (linhas 32-62) que carrega veículos automaticamente ao criar o nó
- Remover o `autoLoadedRef`
- Os veículos só aparecem no nó quando o usuário seleciona manualmente no painel de configuração

### Resultado
O carrossel começa vazio. O usuário abre a configuração, busca os veículos, marca os que quer, e cada um aparece como saída individual no nó. Sem limite artificial de 10.

