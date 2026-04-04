

## Corrigir botões de Resposta Rápida lado a lado

### Problema
O nó `quick_reply` está renderizando um **handle de saída padrão** (o círculo à direita) junto com os botões lado a lado, porque a condição na linha 291 não exclui `isQuickReply`. Isso causa conflito visual e de conexões.

### Correção

**`src/components/flow-builder/FlowNode.tsx`** — linha 291:

Adicionar `!isQuickReply` à condição do handle de saída padrão:

```
{!isMenu && !isMenuList && !isQuickReply && nodeData.nodeType !== "condition" && (
```

Isso garante que o nó `quick_reply` só mostre os handles dentro dos botões lado a lado, sem o handle genérico duplicado.

