

# Fix: Chat bugando ao abrir conversa

## Problema

`chat.wa_lastMsg` vindo da API uazapi pode ser um objeto `{text: "..."}` em vez de string. O React não consegue renderizar objetos diretamente, causando crash.

## Alteração em `src/pages/Conversations.tsx`

**Linha 250** — Tratar `wa_lastMsg` como possível objeto:

```tsx
// De:
{chat.wa_lastMsg || formatPhone(phoneFromChatId(chat.wa_chatid))}

// Para:
{typeof chat.wa_lastMsg === "string"
  ? chat.wa_lastMsg
  : typeof chat.wa_lastMsg === "object" && chat.wa_lastMsg !== null
    ? (chat.wa_lastMsg as any).text ?? (chat.wa_lastMsg as any).caption ?? ""
    : formatPhone(phoneFromChatId(chat.wa_chatid))}
```

Mesma lógica defensiva já aplicada nas bolhas de mensagem — agora aplicada na lista de conversas.

