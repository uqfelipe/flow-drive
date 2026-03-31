

# Fix: Marcar como lido não persiste após refresh

## Problema
O `mark-read` chama `/chat/read` com `{ number: phone }`, mas o endpoint provavelmente espera `chatid` no formato JID (`553399999999@s.whatsapp.net`). As outras chamadas de chat (como `/message/find`) usam `chatid`, não `number`. Por isso a leitura não é registrada na API do WhatsApp e ao recarregar a página os contadores voltam.

## Solução

### `supabase/functions/whatsapp-chat/index.ts`

Alterar o action `mark-read` para enviar `chatid` no formato JID em vez de `number`:

```typescript
if (action === "mark-read") {
  if (!phone) return json({ error: "phone required" }, 400);
  const chatid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
  await apiCall(inst.server_url, inst.instance_token, "/chat/read", { chatid });
  return json({ success: true });
}
```

Uma única alteração na edge function. O hook `useMarkAsRead` no frontend já está correto com atualização otimista.

