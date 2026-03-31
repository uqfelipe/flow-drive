

# Fix: Badge de não lidas reaparece ao trocar de chat

## Problema verificado
Ao abrir "Lu do Magalu" (1 não lida), o badge some pelo `!isActive`. Mas ao trocar para "Anderson Rafael", o badge do "Lu do Magalu" volta com "1" — o `mark-read` não está zerando o contador.

Duas causas:
1. **Edge Function pode estar retornando erro** — os logs mostram erros 405 no endpoint `/chat/readChat` (versão antiga). A versão atual usa `/chat/read`, mas pode não ter sido redeployada ainda.
2. **Sem atualização otimista** — mesmo que o mark-read funcione, o refetch da lista de chats pode trazer o count antigo antes da API do WhatsApp processar. Precisamos zerar `wa_unreadCount` imediatamente no cache do React Query.

## Solução

### 1. Redeploy da Edge Function
A edge function já tem o código correto (`/chat/read` com `{ number: phone }`). Precisa ser redeployada para garantir que a versão atual está no ar.

### 2. Atualização otimista no `useMarkAsRead` (`src/hooks/use-chat.ts`)
Adicionar `onMutate` para zerar `wa_unreadCount` imediatamente no cache:

```typescript
export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phone: string) => chatAction("mark-read", { phone }),
    onMutate: async (phone) => {
      await qc.cancelQueries({ queryKey: ["whatsapp-chats"] });
      const previous = qc.getQueryData<WhatsAppChat[]>(["whatsapp-chats"]);
      qc.setQueryData<WhatsAppChat[]>(["whatsapp-chats"], (old) =>
        (old || []).map((c) => {
          const chatPhone = c.wa_chatid?.replace(/@.*$/, "");
          if (chatPhone === phone) {
            return { ...c, wa_unreadCount: 0 };
          }
          return c;
        })
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        qc.setQueryData(["whatsapp-chats"], context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["whatsapp-chats"] }),
  });
}
```

### 3. Redeploy edge function
Fazer um redeploy do `whatsapp-chat` para garantir que `/chat/read` está ativo (não `/chat/readChat`).

## Resultado esperado
- Ao abrir um chat, o badge some **imediatamente** (otimista)
- Ao trocar de chat, o badge **não volta** (porque o cache já foi zerado e o refetch traz 0)
- O WhatsApp também marca como lido (via API)

