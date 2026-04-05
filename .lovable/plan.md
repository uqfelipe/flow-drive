

## Página de Lembretes com envio via WhatsApp

Criar uma página para agendar lembretes que serão enviados via WhatsApp na data/hora exata configurada (fuso de São Paulo).

### 1. Tabela no Supabase: `reminders`

```sql
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to reminders" ON public.reminders FOR ALL USING (true) WITH CHECK (true);
```

### 2. Edge Function: `send-reminders`

- Função agendada via `pg_cron` (a cada minuto)
- Consulta lembretes com `status = 'pending'` e `scheduled_at <= now()`
- Para cada lembrete, busca o telefone do cliente e envia a mensagem via WhatsApp API (mesmo padrão do webhook existente — `waFetch`)
- Atualiza o status para `sent` ou `failed`

### 3. Página: `src/pages/Reminders.tsx`

- Layout com `AdminLayout`, título "Lembretes"
- Tabela listando todos os lembretes (cliente, mensagem, data/hora agendada, status)
- Botão "Novo Lembrete" abre dialog com:
  - Select de cliente (busca da tabela `customers`)
  - Textarea para mensagem
  - Inputs de data e hora (com precisão de segundos), exibidos em horário de São Paulo
- Botão para cancelar lembretes pendentes

### 4. Hook: `src/hooks/use-reminders.ts`

- `useReminders()` — lista lembretes com join no cliente
- `useCreateReminder()` — insere novo lembrete
- `useCancelReminder()` — atualiza status para `cancelled`

### 5. Rota e Sidebar

- **App.tsx**: Adicionar rota `/reminders` → `<Reminders />`
- **AppSidebar.tsx**: Adicionar item "Lembretes" com ícone `AlarmClock` no grupo "Configuração"

### 6. Cron Job (pg_cron + pg_net)

Agendar chamada à Edge Function a cada minuto:
```sql
SELECT cron.schedule('send-reminders-every-minute', '* * * * *', $$
  SELECT net.http_post(
    url := 'https://umsyxiztgfiedtibxjeo.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer <anon_key>", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
$$);
```

### Resumo das alterações

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `reminders` |
| `supabase/functions/send-reminders/index.ts` | Nova Edge Function |
| `src/pages/Reminders.tsx` | Nova página |
| `src/hooks/use-reminders.ts` | Novo hook |
| `src/App.tsx` | Adicionar rota |
| `src/components/AppSidebar.tsx` | Adicionar link na sidebar |
| SQL (insert tool) | Configurar cron job |

