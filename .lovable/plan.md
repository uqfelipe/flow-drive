

# Correcao do sistema de marcar conversa como lida

## Problema identificado

Dois bugs trabalham juntos para impedir o funcionamento correto:

**Bug 1 - Comparacao de timestamps com unidades diferentes:** Em `useWhatsAppChats` (use-chat.ts, linha 72), o codigo compara `readAtMs` (milissegundos, vindo de `new Date().getTime()`) com `wa_lastMsgTimestamp` que pode vir da API em **segundos** (ex: `1711900000`). Como `readAtMs` (~1.7 trilhao) e sempre maior que um timestamp em segundos (~1.7 bilhao), isso mascara o problema em alguns casos. Porem, quando o timestamp da API vem em **milissegundos**, a comparacao falha: `read_at` pode ser menor que `wa_lastMsgTimestamp`, e o unread count nao e zerado.

**Bug 2 - useEffect pula mark-read quando ultima mensagem e propria:** Em `Conversations.tsx` (linha 619), se a ultima mensagem do chat e `fromMe`, o effect retorna sem chamar `markAsRead`. Embora a primeira execucao (com `messages` undefined) chame markAsRead, o `onSettled` invalida a query de chats, que refaz a comparacao com o bug 1.

## Correcoes

### Arquivo 1: `src/hooks/use-chat.ts`

**Normalizar timestamp para milissegundos na comparacao:**
- Antes de comparar `readAtMs >= lastMsgTs`, converter `lastMsgTs` para ms se estiver em segundos
- Logica: se `lastMsgTs < 10000000000` (10 digitos), multiplicar por 1000

```typescript
const lastMsgTs = c.wa_lastMsgTimestamp ?? 0;
const lastMsgMs = lastMsgTs < 10000000000 ? lastMsgTs * 1000 : lastMsgTs;
if (readAtMs >= lastMsgMs) {
  return { ...c, wa_unreadCount: 0 };
}
```

### Arquivo 2: `src/pages/Conversations.tsx`

**Chamar markAsRead sempre ao selecionar uma conversa, independente de quem enviou a ultima mensagem:**

- Remover o `if (lastMessage.fromMe) return;`
- Simplificar o useEffect: ao mudar `selectedPhone`, marcar como lida imediatamente
- Manter dedup para evitar chamadas repetidas desnecessarias (usando ref com o phone)
- Adicionar chamada ao clicar na conversa tambem (antes de esperar mensagens carregarem)

```typescript
useEffect(() => {
  if (!selectedPhone) {
    lastHandledIncomingRef.current = null;
    return;
  }

  // Marca como lida assim que selecionar OU quando chegar mensagem nova
  const key = messages?.length
    ? `${selectedPhone}:${messages[messages.length - 1].id}`
    : `${selectedPhone}:empty`;

  if (lastHandledIncomingRef.current === key) return;
  lastHandledIncomingRef.current = key;
  markAsRead.mutate(selectedPhone);
}, [selectedPhone, messages]);
```

## Resultado

- Clicou na conversa → `markAsRead` dispara imediatamente
- Optimistic update zera o badge na hora
- DB persiste `read_at` com timestamp atual
- Refetch valida: comparacao normalizada garante que `read_at >= lastMsgTs`
- Reload: busca `chat_read_status` do DB, compara corretamente → conversa permanece lida
- Nova mensagem depois: `wa_lastMsgTimestamp` sera maior que `read_at` → volta a mostrar nao lida

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/use-chat.ts` | Normalizar timestamp para ms na comparacao de read status |
| `src/pages/Conversations.tsx` | Remover skip do `fromMe`, marcar como lida sempre ao selecionar |

