

# Redesign do Flow Builder no estilo Typebot

## Visao geral

Transformar o flow builder atual (nodes compactos com icone+label) em um editor visual no estilo Typebot, onde cada node e um "grupo/card" que contem **multiplos blocos empilhados** dentro dele, com visual limpo, fundo branco/claro, bordas suaves e handles laterais (direita).

## Principais diferencas visuais (referencia vs atual)

| Aspecto | Atual | Typebot (desejado) |
|---------|-------|---------------------|
| Nodes | Compactos, icone+label, 180-220px | Cards grandes com titulo no topo e blocos internos empilhados |
| Palette | Categorias colapsaveis com drag | Grid 2 colunas por categoria (Bubbles, Inputs, Logic, Integrations) |
| Handles | Topo/base, circulares pequenos | Lado direito, azuis, por bloco interno |
| Background | Dots escuros | Grid claro ou dots claros |
| Cores | Gradiente por categoria | Branco/cinza claro, icones coloridos por tipo |
| Node interno | Um bloco = um node | Um "grupo" contem varios blocos (messages, inputs, collects) |

## Reorganizacao de categorias (estilo Typebot)

- **Bubbles**: Text, Image, Video, Embed (corresponde a `message`)
- **Inputs**: Text, Number, Email, Website, Date, Phone, Button, Payment, Rating, File (corresponde a `input`)
- **Logic**: Set variable, Condition, Redirect, Code, Typebot (corresponde a `logic`)
- **Integrations**: corresponde a `database` + `automation` + `ai`

## Arquivos alterados

### 1. `src/components/flow-builder/nodeTypes.ts`
- Reorganizar categorias para Bubbles, Inputs, Logic, Integrations
- Atualizar `FlowNodeCategory` em `types/index.ts`
- Adicionar novos tipos genericos (Text input, Number input, Email input, etc.)
- Manter tipos existentes do sistema de locadora como sub-opcoes

### 2. `src/types/index.ts`
- Atualizar `FlowNodeCategory` para incluir `'bubble' | 'input' | 'logic' | 'integration'`
- Adicionar interface `FlowGroupData` para nodes que contem multiplos blocos internos

### 3. `src/components/flow-builder/FlowNode.tsx` (rewrite completo)
- Node estilo card: fundo branco/card, bordas cinza claro, rounded-lg
- Header com titulo editavel e icone de play
- Lista de blocos internos empilhados (cada um com icone, texto e handle source na direita)
- Handle target na esquerda do card
- Blocos com icones coloridos (laranja para bubbles/collect, azul para handles)
- Suporte a "Collect [Variable]" com badge colorido (laranja)

### 4. `src/components/flow-builder/NodePalette.tsx` (rewrite)
- Layout grid 2 colunas por categoria
- Categorias: Bubbles, Inputs, Logic, Integrations
- Icone de cadeado no topo (lock icon decorativo)
- Itens como botoes com icone + label, sem grip handle
- Visual limpo, fundo branco

### 5. `src/pages/FlowBuilder.tsx`
- Remover toolbar superior (simplificar)
- Background mais claro (grid ou dots claros)
- Edge style: cinza/azul suave, curvo (bezier), sem animacao
- Remover MiniMap (Typebot nao tem)
- Manter Controls simples

### 6. `src/components/flow-builder/NodeConfigPanel.tsx`
- Adaptar para editar blocos internos do grupo
- Permitir adicionar/remover blocos dentro de um grupo

### 7. `tailwind.config.ts`
- Ajustar cores dos nodes para paleta mais suave (laranja, azul, verde)

## Fluxo do usuario

1. Arrasta um tipo de bloco da palette para o canvas
2. Cria um "grupo" automaticamente com aquele bloco dentro
3. Pode adicionar mais blocos ao grupo clicando "+" dentro do card
4. Conecta grupos arrastando dos handles azuis na direita de cada bloco
5. Cada grupo tem titulo editavel no header

## Resultado esperado

- Visual identico ao Typebot: cards brancos com blocos empilhados
- Palette com grid 2 colunas organizado por Bubbles/Inputs/Logic/Integrations
- Handles azuis na lateral direita dos blocos
- Edges curvos e suaves
- Background limpo com grid sutil

