

# Mensagens em tempo real no chat WhatsApp

## Problema
Atualmente as mensagens são atualizadas por polling a cada 5 segundos (`refetchInterval: 5000`), causando delay perceptível. Além disso, ao enviar uma mensagem, o usuário precisa esperar o próximo ciclo de polling para vê-la aparecer.

## Solução

### 1. Optimistic Update ao enviar mensagem (`src/hooks/use-chat.ts`)
Quando o usuário envia uma mensagem, inserir imediatamente no cache local do React Query antes da API responder:
- No `useSendMessage`, usar `onMutate` para adicionar a mensagem ao cache com status "enviando"
- No `onSuccess`, invalidar para buscar o estado real
- No `onError`, reverter o cache (rollback)

### 2. Reduzir polling para 2 segundos (`src/hooks/use-chat.ts`)
- Mensagens: `refetchInterval: 2000` (era 5000)
- Chats: `refetchInterval: 5000` (era 10000)

### 3. Invalidar imediatamente após envio
- Já existe o `invalidateQueries` no `onSuccess`, mas adicionar também no `onSettled` para garantir

## Detalhes técnicos

No `useSendMessage`:
```typescript
onMutate: async ({ phone, text }) => {
  await qc.cancelQueries({ queryKey: ["whatsapp-messages", phone] });
  const previous = qc.getQueryData(["whatsapp-messages", phone]);
  const optimisticMsg = {
    id: `temp-${Date.now()}`,
    chatid: `${phone}@s.whatsapp.net`,
    content: text,
    fromMe: true,
    timestamp: Math.floor(Date.now() / 1000),
    type: "text",
    status: "pending",
    text: text,
  };
  qc.setQueryData(["whatsapp-messages", phone], (old) => [...(old || []), optimisticMsg]);
  return { previous };
},
onError: (_, vars, context) => {
  qc.setQueryData(["whatsapp-messages", vars.phone], context?.previous);
},
onSettled: (_, __, vars) => {
  qc.invalidateQueries({ queryKey: ["whatsapp-messages", vars.phone] });
  qc.invalidateQueries({ queryKey: ["whatsapp-chats"] });
}
```

Mesma abordagem para `useSendImage`.

Resultado: mensagem aparece instantaneamente na tela ao enviar, e recebimento atualiza a cada 2s.

