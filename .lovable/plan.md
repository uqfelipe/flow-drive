

## Botões de Resposta Rápida lado a lado no FlowNode

### O que muda
No nó `quick_reply`, os botões "Sim" / "Não" passam a ser exibidos **lado a lado** (horizontal), igual ao visual do WhatsApp na imagem, em vez de empilhados verticalmente como os outros menus.

### Alteração

**`src/components/flow-builder/FlowNode.tsx`**

1. Separar a renderização do `quick_reply` da lógica genérica `isMenu`
2. Criar um bloco específico para `quick_reply` que renderiza os botões em `flex-row` (lado a lado), com uma linha divisória no topo (estilo WhatsApp) e cada botão ocupando espaço igual
3. Cada botão mantém seu handle de saída (`option-{idx}`) posicionado à direita
4. Remover `quick_reply` do `isMenu` e usar `isQuickReply` separado

### Visual esperado no canvas
```text
┌──────────────────────────┐
│ ⚡ Resposta Rápida    ✏ ✕│
├──────────────────────────┤
│  Você está de acordo?    │
│ ─────────────────────────│
│   Sim  ●  │   Não  ●    │
└──────────────────────────┘
```

