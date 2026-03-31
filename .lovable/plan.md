

# Marcar chat como lido ao abrir

## Problema
Quando você abre um chat, o badge de notificações some (já implementado com `!isActive`), mas ao trocar de chat e voltar, os números reaparecem porque o `wa_unreadCount` vem da API e nunca é zerado.

## Solução

1. **Adicionar action `mark-read` na Edge Function** (`supabase/functions/whatsapp-chat/index.ts`) — Chamar a API da uazapi `/chat/readChat` para marcar as mensagens como lidas no WhatsApp quando o usuário abrir o chat.

2. **Criar hook `useMarkAsRead`** (`src/hooks/use-chat.ts`) — Mutation que chama `mark-read` e depois invalida a lista de chats para atualizar o `wa_unreadCount` para 0.

3. **Chamar ao selecionar chat** (`src/pages/Conversations.tsx`) — Quando o `selectedChat` mudar, chamar `markAsRead` automaticamente com o telefone do chat selecionado. Isso zera o contador na API e no frontend.

## Alterações

**`supabase/functions/whatsapp-chat/index.ts`** — Novo bloco antes do `return json({ error: "Invalid action" })`:
```typescript
if (action === "mark-read") {
  if (!phone) return json({ error: "phone required" }, 400);
  const chatid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
  await apiCall(inst.server_url, inst.instance_token, "/chat/readChat", { chatid });
  return json({ success: true });
}
```

**`src/hooks/use-chat.ts`** — Novo hook:
```typescript
export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phone: string) => chatAction("mark-read", { phone }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-chats"] }),
  });
}
```

**`src/pages/Conversations.tsx`** — Chamar `markAsRead` dentro de um `useEffect` quando `selectedChat` mudar, para marcar automaticamente como lido.

