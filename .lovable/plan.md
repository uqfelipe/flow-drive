
# Indicador de chat ativo + ocultar notificações

## O que será feito

1. **Indicador visual do chat aberto** — Adicionar uma barra lateral colorida (primary) à esquerda do chat selecionado, estilo WhatsApp Web.

2. **Ocultar badge de notificações no chat aberto** — Quando o chat estiver selecionado (`isActive`), esconder o badge de contagem de mensagens não lidas. Na linha 311, adicionar `!isActive` à condição para não mostrar o badge.

## Alterações

**`src/pages/Conversations.tsx`**:

- **Linha 248-254** — Adicionar `border-l-3 border-primary` ao chat ativo e melhorar o destaque visual:
```tsx
isActive
  ? "bg-primary/12 shadow-sm shadow-primary/10 border-l-[3px] border-primary"
  : "hover:bg-accent/40 active:scale-[0.99] border-l-[3px] border-transparent",
```

- **Linha 311** — Mudar condição do badge de `{hasUnread && (` para `{hasUnread && !isActive && (` para esconder notificações quando o chat está aberto.

Duas edições simples, sem mudanças em outros arquivos.
