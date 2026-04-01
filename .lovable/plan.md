

# Redesign do Flow Builder baseado na referência visual

## Visão geral
Redesenhar o construtor de fluxos para ficar semelhante à imagem de referência: sidebar com lista vertical (ícone + nome + descrição), categorias reorganizadas (Mensagens, Menus, Mídia, etc.), toolbar superior com toggle ativo/inativo, undo/redo, download e nome editável, nodes com visual mais limpo e colorido por tipo, botão X para deletar no node, legenda no canto inferior direito, e cada tipo de node com cor única.

## Alterações

### 1. `src/components/flow-builder/nodeTypes.ts` — Reorganizar categorias e tipos

Trocar as 4 categorias atuais (bubble/input/logic/integration) por categorias que espelham a imagem:
- **Mensagens**: Mensagem, Enviar Link, Pix (Copia e Cola), Copia e Cola
- **Menus**: Menu Texto, Menu Botões, Menu Carrossel, Enquete
- **Mídia**: Enviar Imagem, Enviar Áudio, Enviar Vídeo, Enviar Arquivo, Enviar Figurinha, Enviar Localização, Cartão de Contato
- **Entrada de Dados**: Captura texto, número, email, data, telefone, nome, CPF
- **Lógica**: Condição, Aguardar, Delay, Definir variável
- **Integrações**: Webhook, Transferir p/ Humano, Encerramento, Integração

Atribuir cor única por tipo de node (conforme a legenda da imagem: Mensagem = roxo, Menu Texto = laranja, Menu Botões = azul, etc.)

### 2. `src/types/index.ts` — Atualizar FlowNodeCategory

Expandir o type para incluir as novas categorias: `'mensagem' | 'menu' | 'midia' | 'entrada' | 'logica' | 'integracao'`

### 3. `src/components/flow-builder/NodePalette.tsx` — Layout tipo lista vertical

Trocar o grid 2 colunas por lista vertical como na imagem:
- Cada item: ícone colorido à esquerda + nome em bold + descrição pequena abaixo
- Categorias com ícone e seta para colapsar/expandir
- Título "Componentes" no topo
- Manter busca

### 4. `src/components/flow-builder/FlowNode.tsx` — Visual dos nodes

- Borda colorida por tipo de node (não apenas por categoria)
- Título colorido no header com ícone do tipo
- Botão X no canto superior direito para deletar o node diretamente
- Para nodes tipo "Menu Texto": mostrar as opções (items) inline dentro do node, cada opção com seu próprio handle de saída à direita com label
- Conteúdo do node visível (mensagem de texto, opções do menu, etc.)
- Handles de saída com seta triangular colorida (como na imagem)

### 5. `src/pages/FlowBuilder.tsx` — Toolbar e legenda

**Toolbar superior redesenhada:**
- Seta voltar à esquerda
- Nome do fluxo editável (input inline)
- Botões undo/redo
- Toggle switch Ativo/Inativo
- Botão download
- Botão "Salvar" estilizado (azul)

**Legenda (Legend panel):**
- Componente fixo no canto inferior direito do canvas
- Grid 2 colunas mostrando bolinha colorida + nome de cada tipo de node
- Fundo branco com sombra sutil

### 6. `src/components/flow-builder/FlowLegend.tsx` — Novo componente

Componente de legenda que lista todos os tipos de node com sua cor correspondente, posicionado absolute no canto inferior direito.

### 7. `src/components/flow-builder/NodeConfigPanel.tsx` — Adaptação

Atualizar cores e categorias para refletir os novos tipos. Adicionar config para opções de menu (adicionar/remover items para Menu Texto, Menu Botões).

## Resultado esperado
Visual e UX do flow builder muito próximo à referência: sidebar como lista com descrições, nodes coloridos por tipo com conteúdo visível, toolbar completa com toggle e undo/redo, e legenda de cores.

