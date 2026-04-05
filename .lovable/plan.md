

## Múltipla escolha de veículos no Carrossel

### Objetivo
Substituir o botão "Carregar veículos" (que carrega todos automaticamente) por uma lista de checkboxes onde o usuário escolhe manualmente quais veículos aparecem no carrossel.

### Alterações

#### `src/components/flow-builder/NodeConfigPanel.tsx`
- Adicionar estado local `allVehicles` (lista de todos os veículos disponíveis do banco) e um botão "Buscar veículos" que popula essa lista
- Renderizar cada veículo como um item com **Checkbox** (múltipla escolha) mostrando imagem, nome e marca
- Quando o usuário marca/desmarca um checkbox, atualizar `config.vehicles` com apenas os selecionados
- Importar `Checkbox` de `@/components/ui/checkbox`
- Adicionar estado com `useState` (o componente precisará ser ajustado para suportar estado local — atualmente é stateless)
- Manter validação de mín 2, máx 10 veículos selecionados

#### Fluxo do usuário
1. Abre o painel de configuração do nó Carrossel
2. Clica "Buscar veículos" → lista todos os disponíveis com checkboxes
3. Marca os veículos desejados → apenas esses aparecem como saídas no nó
4. Pode desmarcar/remarcar a qualquer momento

