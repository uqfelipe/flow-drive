

# Fix: Mensagens não lidas não persistem após marcar como lida

## Problema raiz

O sistema depende **exclusivamente** da API WhatsApp (`/chat/read`) para persistir o status de leitura. Essa chamada está falhando com erro 400 ("Missing number in payload") — já tentamos `number` e `chatid`, ambos falham. Mesmo quando funciona, o refetch a cada 10s traz `wa_unreadCount` da API antes dela processar o read receipt.

**Não existe nenhuma persistência local** — ao recarregar a página, o frontend busca os chats da API e os contadores voltam.

## Solução: Tabela local `chat_read_status`

Criar uma tabela no Supabase para rastrear quando cada chat foi lido. O frontend cruza essa informação com o timestamp da última mensagem para decidir se mostra ou não o badge.

```text
┌─────────────────┐     ┌──────────────────┐
│  WhatsApp API   │     │  chat_read_status │
│  wa_unreadCount │     │  chat_id, read_at │
│  wa_lastMsgTs   │     │                  │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         └───────┐   ┌──────────┘
                 ▼   ▼
          Frontend merge:
          if read_at >= lastMsgTs → unread = 0
          else → show wa_unreadCount
```

## Mudanças

### 1. Migração SQL — criar `chat_read_status`

```sql
CREATE TABLE public.chat_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL UNIQUE,
  read_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.chat_read_status FOR ALL USING (true) WITH CHECK (true);
```

### 2. Edge Function `whatsapp-chat/index.ts` — action `mark-read`

Alterar para fazer **upsert** na tabela `chat_read_status` (persistência garantida) e tentar a API WhatsApp como best-effort (sem bloquear):

```typescript
if (action === "mark-read") {
  if (!phone) return json({ error: "phone required" }, 400);
  const chatid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
  
  // 1. Persistir no banco (garantido)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  await supabase.from("chat_read_status")
    .upsert({ chat_id: chatid, read_at: new Date().toISOString() }, 
            { onConflict: "chat_id" });
  
  // 2. Tentar API WhatsApp (best-effort)
  try { await apiCall(..., "/chat/read", { number: phone }); } catch {}
  
  return json({ success: true });
}
```

### 3. Hook `use-chat.ts` — `useWhatsAppChats`

Após buscar os chats da API, também buscar `chat_read_status` do Supabase. Para cada chat, se `read_at >= wa_lastMsgTimestamp`, zerar `wa_unreadCount`:

```typescript
// Dentro do queryFn de useWhatsAppChats:
const { data: readStatuses } = await supabase
  .from("chat_read_status").select("chat_id, read_at");

// Para cada chat, cruzar:
return chats.map(c => {
  const rs = readStatuses?.find(r => r.chat_id === c.wa_chatid);
  if (rs) {
    const readAt = new Date(rs.read_at).getTime() / 1000;
    const lastMsg = c.wa_lastMsgTimestamp ?? 0;
    if (readAt >= lastMsg) {
      return { ...c, wa_unreadCount: 0 };
    }
  }
  return c;
});
```

### 4. Frontend `Conversations.tsx` — sem mudanças

O `useEffect` que chama `markAsRead.mutate(selectedPhone)` já existe (linha 164-169). A atualização otimista no hook `useMarkAsRead` já zera o badge imediatamente. Nenhuma mudança necessária.

## Comportamento final

| Ação | Resultado |
|------|-----------|
| Clica no chat | Badge some imediatamente (otimista) |
| Troca de chat | Badge não volta (persistido no banco) |
| Recarrega página | Badge continua zerado (read_at >= lastMsgTs) |
| Nova mensagem chega | Badge volta (lastMsgTs > read_at) |
| Clica de novo | Badge some novamente |

## Arquivos alterados

1. **Nova migração SQL** — cria tabela `chat_read_status`
2. **`supabase/functions/whatsapp-chat/index.ts`** — upsert no banco + API best-effort
3. **`src/hooks/use-chat.ts`** — cruzar read status com chats da API

