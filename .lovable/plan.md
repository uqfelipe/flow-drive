

## Carrossel de Veículos com saída por veículo (estilo menu)

### Ideia
Transformar o nó `vehicle_carousel` para que ele carregue os veículos disponíveis do banco e mostre cada veículo como uma opção com seu próprio handle de saída — igual ao menu de botões. Assim o usuário pode conectar cada veículo a um caminho diferente no fluxo.

### Alterações

#### 1. `src/components/flow-builder/NodeConfigPanel.tsx`
- Adicionar botão **"Carregar veículos"** que busca veículos disponíveis do Supabase (filtrados pela categoria selecionada)
- Salvar a lista de veículos carregados no config do nó como `vehicles: [{ id, name, brand, model, image }]`
- Mostrar os veículos carregados na lista com nome e marca
- Permitir remover veículos individualmente da lista

#### 2. `src/components/flow-builder/FlowNode.tsx`
- Ler `nodeData.config?.vehicles` (lista de veículos carregados)
- Renderizar cada veículo como uma linha com handle de saída individual (igual ao menu), usando `id={`vehicle-${idx}`}`
- Mostrar nome + marca de cada veículo truncado
- Remover o handle único "selected" quando há veículos carregados

#### 3. `supabase/functions/whatsapp-webhook/index.ts`
- Na resposta do carrossel (`veiculo_XXX`), buscar o índice do veículo na lista de veículos do config do nó
- Usar `findNextNodeId(flowEdges, currentNodeId, `vehicle-${idx}`)` para seguir pela saída correspondente ao veículo escolhido
- Fallback: se o veículo não estiver na lista do config, usar o handle "selected" como padrão

### Fluxo do usuário
1. Arrasta o nó Carrossel de Veículos
2. No painel de configuração, seleciona categoria (opcional) e clica "Carregar veículos"
3. Os veículos disponíveis aparecem no nó, cada um com sua saída
4. Conecta cada saída a um nó diferente (ex: Corolla → mensagem A, Civic → mensagem B)
5. No WhatsApp, quando o cliente escolhe o Corolla, o fluxo segue pela saída correspondente

