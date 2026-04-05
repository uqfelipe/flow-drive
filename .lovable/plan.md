

## Adicionar saída de resposta no nó Carrossel de Veículos

### Problema atual
O nó `vehicle_carousel` tem apenas uma saída genérica (handle padrão). Quando o cliente seleciona um veículo no carrossel, o fluxo segue para o próximo nó conectado, mas não há como visualmente conectar essa resposta a um nó específico no construtor de fluxos.

### Solução
Adicionar um handle de saída dedicado chamado "Resposta" no nó `vehicle_carousel`, similar ao que já existe nos nós `condition` e `menu_buttons`. O webhook já salva `{{veiculo_nome}}` e `{{veiculo_selecionado}}` — basta garantir que a conexão visual funcione.

### Alterações

#### 1. `src/components/flow-builder/FlowNode.tsx`
- Excluir `vehicle_carousel` do handle padrão (linha 286: adicionar ao filtro `!isMenu && !isMenuList && nodeData.nodeType !== "condition"`)
- Adicionar um bloco visual abaixo do indicador do carrossel com um handle de saída nomeado `"selected"`, exibindo o texto "Veículo selecionado →" com um ícone de handle, no mesmo estilo dos handles de condição

#### 2. `supabase/functions/whatsapp-webhook/index.ts`
- Na linha 1379, alterar `findNextNodeId(flowEdges, currentNodeId)` para `findNextNodeId(flowEdges, currentNodeId, "selected")` para que o webhook use o handle correto ao avançar o fluxo após a seleção do veículo

### Resultado
No construtor de fluxos, o nó Carrossel de Veículos terá uma saída visual "Veículo selecionado" que pode ser conectada a qualquer nó seguinte (ex: mensagem de confirmação usando `{{veiculo_nome}}`). Quando o cliente clicar no botão do carrossel no WhatsApp, o fluxo seguirá pela conexão dessa saída.

