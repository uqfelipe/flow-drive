

## Adicionar nó "Resposta Rápida" (Sim/Não) ao Flow Builder

### O que será adicionado
Um novo tipo de nó `quick_reply` na categoria **menu** que envia uma mensagem com botões de resposta rápida (estilo da imagem: "Sim" / "Não"). Funciona como um `menu_buttons` simplificado, focado em respostas binárias/rápidas.

### Alterações

**1. `src/components/flow-builder/nodeTypes.ts`**
- Adicionar novo nó `quick_reply` na categoria `menu` com ícone `MessageSquare` (ou `SquareMousePointer`), cor verde, e defaultConfig com mensagem + 2 botões ("Sim", "Não")

**2. `src/components/flow-builder/FlowNode.tsx`**
- Incluir `quick_reply` na lógica de `isMenu` para renderizar handles de saída por botão (reutiliza a mesma lógica de `menu_buttons`)

**3. `src/components/flow-builder/NodeConfigPanel.tsx`**
- Adicionar bloco de configuração simplificado para `quick_reply`:
  - Campo de mensagem (textarea)
  - 2 botões editáveis (máx. 3), interface igual à do `menu_buttons` simplificado

**4. `supabase/functions/whatsapp-webhook/index.ts`**
- Adicionar `quick_reply` ao `SUPPORTED_NODE_TYPES`
- Tratar `quick_reply` no processFlow igual a `menu_buttons` (envia como botões interativos)
- Tratar `quick_reply` no `handleMenuSelection` igual a `menu_buttons`
- Incluir `quick_reply` na lógica de seleção de menu no processamento de mensagens

### Comportamento
- No canvas: mostra a mensagem + botões com handles de saída para cada opção
- No WhatsApp: envia como botões interativos (type "button") idêntico ao menu_buttons
- Cada botão tem um handle de saída para roteamento visual no flow

