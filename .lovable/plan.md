

## Auto-carregar veículos no nó Carrossel

### Situação atual
O nó Carrossel de Veículos já suporta saídas individuais por veículo, mas o usuário precisa abrir o painel de configuração e clicar em "Carregar veículos" manualmente. Você quer que os veículos apareçam automaticamente no nó assim que ele for adicionado ao fluxo.

### Alterações

#### 1. `src/components/flow-builder/FlowNode.tsx`
- Adicionar um `useEffect` que detecta quando o nó `vehicle_carousel` é criado sem veículos carregados (`config.vehicles` vazio ou undefined)
- Buscar automaticamente os veículos disponíveis do Supabase (respeitando categoria e maxCards do config)
- Atualizar o config do nó com os veículos carregados usando um custom event (`flow-update-node-config`)

#### 2. `src/pages/FlowBuilder.tsx`
- Escutar o evento `flow-update-node-config` para receber atualizações automáticas de config do nó
- Atualizar o nó no estado do React Flow quando o evento for disparado

#### 3. `src/components/flow-builder/NodeConfigPanel.tsx`
- Manter o botão "Carregar veículos" para recarregar manualmente se necessário (ex: novos veículos adicionados)
- Sem mudanças funcionais, apenas complementar

### Resultado
Ao arrastar o nó Carrossel de Veículos para o canvas, os veículos disponíveis serão carregados automaticamente e cada um aparecerá como uma saída individual no nó, sem necessidade de abrir o painel de configuração.

