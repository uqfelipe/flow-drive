

## Corrigir envio de lembretes via WhatsApp

### Problemas encontrados

1. **Endpoint errado na API do WhatsApp** — a função usa `/message/sendText` mas o endpoint correto (usado no restante do projeto) é `/send/text`
2. **Cron job não configurado** — a função `send-reminders` nunca é chamada automaticamente. Precisa ser configurada via `pg_cron` no SQL Editor do Supabase.

### Correções

**Arquivo: `supabase/functions/send-reminders/index.ts`**

- Alterar o endpoint de `/message/sendText` para `/send/text` na função `sendWhatsAppText`
- Adicionar `instance_name` no path da API (padrão do projeto: `${server_url}/message/...` vs `${server_url}/send/text`)

Trecho corrigido:
```typescript
const res = await fetch(`${inst.server_url}/send/text`, {
  method: "POST",
  headers: { "Content-Type": "application/json", token: inst.instance_token },
  body: JSON.stringify({ number: phone, text: message }),
});
```

**SQL (via insert tool — cron job)**

Configurar o `pg_cron` para chamar a função a cada minuto:
```sql
SELECT cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://umsyxiztgfiedtibxjeo.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtc3l4aXp0Z2ZpZWR0aWJ4amVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzcyMzksImV4cCI6MjA5MDU1MzIzOX0.BCzXCyXyU62RdJATe0fqCcPiNtjFDy2adP6SpisjYyw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Resetar o lembrete que falhou** para testar novamente:
```sql
UPDATE reminders SET status = 'pending', sent_at = NULL WHERE id = '05c32483-2f6c-4763-b12e-bc865c4b5d7c';
```

### Resumo

| Alteração | Arquivo/Local |
|-----------|---------------|
| Corrigir endpoint `/send/text` | `supabase/functions/send-reminders/index.ts` |
| Configurar cron job | SQL Editor do Supabase |
| Resetar lembrete falhado | SQL Editor do Supabase |

