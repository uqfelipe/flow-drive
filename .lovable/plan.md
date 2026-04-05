

## Configurar cron job para envio automático de lembretes

### Problema confirmado
- A Edge Function `send-reminders` funciona corretamente (testei agora e enviou com sucesso).
- A tabela `cron.job` está **vazia** — não existe nenhum agendamento automático.
- As extensões `pg_cron` e `pg_net` já estão habilitadas.

### Solução
Executar o seguinte SQL via **insert tool** (não via migration, pois contém dados específicos do projeto):

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

Isso fará a função rodar automaticamente a cada minuto, processando todos os lembretes pendentes cujo horário já passou.

### Nenhum arquivo de código precisa ser alterado
A única ação é inserir o cron job no banco.

