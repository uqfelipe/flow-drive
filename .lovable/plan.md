

# Corrigir indicador de digitando no WhatsApp

## Problema
A API `/chat/presence` está retornando `{"isOnline":false,"isTyping":false}` sempre. Isso pode ser porque:
1. A API do WhatsApi usa um endpoint ou campo diferente para presença
2. O `chatid` pode precisar usar o formato `@lid` em vez de `@s.whatsapp.net` (nos dados da API, vemos que o sender é `255916012216453@lid`)

## Plano

### 1. Testar envio de mensagem pelo browser
Vou enviar uma mensagem de teste para 553398417049 pela interface, e você digita de volta para testarmos.

### 2. Ajustar Edge Function para tentar ambos formatos de presença (`supabase/functions/whatsapp-chat/index.ts`)
- Tentar o endpoint `/chat/presence` com o `chatid` no formato `@s.whatsapp.net`
- Se não funcionar, tentar também com o `wa_chatlid` (formato `@lid`) que a API retorna nos chats
- Adicionar log para debug do que a API retorna

### 3. Passar o `wa_chatlid` do chat selecionado para o hook de presença (`src/pages/Conversations.tsx` + `src/hooks/use-chat.ts`)
- O chat selecionado tem o campo `wa_chatlid` (ex: `255916012216453@lid`)
- Passar esse ID alternativo para o `usePresence` hook
- Na edge function, usar esse ID se disponível para a chamada de presença

### 4. Reduzir polling de presença para 2s
- Mudar `refetchInterval` de 3000 para 2000ms para detecção mais rápida

## Detalhes técnicos

```typescript
// usePresence agora aceita chatLid opcional
export function usePresence(phone: string | null, chatLid?: string) {
  return useQuery<PresenceData>({
    queryKey: ["whatsapp-presence", phone],
    queryFn: async () => {
      if (!phone) return { isOnline: false, isTyping: false };
      const data = await chatAction("check-presence", { 
        phone, 
        chatLid: chatLid || "" 
      });
      return {
        isOnline: data?.isOnline ?? false,
        isTyping: data?.isTyping ?? data?.composing ?? false,
      };
    },
    enabled: !!phone,
    refetchInterval: 2000,
  });
}
```

Edge function tentará ambos formatos:
```typescript
if (action === "check-presence") {
  const chatid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
  const chatLid = extra?.chatLid || "";
  try {
    // Try with chatLid first if available
    let data;
    if (chatLid) {
      data = await apiCall(serverUrl, token, "/chat/presence", { chatid: chatLid });
    }
    if (!data?.isOnline && !data?.composing) {
      data = await apiCall(serverUrl, token, "/chat/presence", { chatid });
    }
    return json({ isOnline: !!data?.isOnline, isTyping: !!data?.composing || !!data?.isTyping });
  } catch (_e) {
    return json({ isOnline: false, isTyping: false });
  }
}
```

No Conversations.tsx, passar o `wa_chatlid`:
```typescript
const { data: presence } = usePresence(selectedPhone, selectedChat?.wa_chatlid);
```

## Arquivos modificados
- `supabase/functions/whatsapp-chat/index.ts` - Tentar ambos formatos de chatid
- `src/hooks/use-chat.ts` - Aceitar chatLid, reduzir polling
- `src/pages/Conversations.tsx` - Passar wa_chatlid para usePresence

