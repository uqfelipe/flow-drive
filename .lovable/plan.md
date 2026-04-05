
## Teste rápido de lembrete em segundos + correção do não envio

### O que encontrei
- Existe um lembrete vencido ainda com status `pending` (`54e82772-e43c-4d85-b1d0-a6aa0886e070`), então a criação do lembrete está funcionando.
- A função `send-reminders` não está rodando automaticamente hoje:
  - `cron.job` está vazio
  - `cron.job_run_details` está vazio
- O último erro da função foi o 405 antigo; depois disso não houve nova execução automática.
- Mesmo com campo de segundos na UI, o envio automático atual nunca será “no segundo exato”, porque `pg_cron` roda por minuto, não por segundo.

### Plano
1. **Corrigir o fluxo real de execução**
   - Manter o envio automático por `pg_cron` para produção.
   - Configurar o cron corretamente no Supabase para chamar `send-reminders` a cada minuto.

2. **Criar um modo de teste rápido na página de lembretes**
   - Adicionar botão **“Criar teste em 10s”**.
   - Esse botão usa o contato já salvo, cria uma mensagem padrão de teste e agenda o lembrete para `agora + 10 segundos`.

3. **Adicionar processamento manual imediato**
   - Adicionar botão **“Processar agora”** na página.
   - Esse botão chama a Edge Function `send-reminders` via `supabase.functions.invoke(...)`.
   - Assim dá para verificar o envio em segundos, sem depender do cron.

4. **Automatizar a verificação visual**
   - Depois de criar o teste, mostrar um countdown.
   - Quando chegar no horário, a própria página dispara o processamento manual.
   - Atualizar a lista e mostrar claramente se ficou `sent`, `failed` ou continuou `pending`.

5. **Melhorar a Edge Function para debug**
   - Fazer `send-reminders` aceitar filtro opcional por `reminderId`.
   - Retornar resultado detalhado por lembrete:
     - enviado
     - falhou
     - sem telefone
     - sem instância
   - Isso facilita testar um lembrete específico sem processar todos.

6. **Melhorar a UX de status**
   - Mostrar horário de São Paulo com mais clareza.
   - Destacar quando o lembrete já venceu mas ainda não foi processado.
   - Exibir feedback do teste rápido na própria tela.

7. **Ajuste pequeno na tela**
   - Adicionar `DialogDescription` no modal para remover o warning atual de acessibilidade.

### Arquivos a ajustar
- `src/pages/Reminders.tsx`
  - botão de teste em 10s
  - botão “Processar agora”
  - countdown
  - feedback de envio
- `src/hooks/use-reminders.ts`
  - mutation para invocar a Edge Function manualmente
- `supabase/functions/send-reminders/index.ts`
  - suporte a `reminderId`
  - resposta detalhada de processamento
- **Supabase SQL Editor**
  - criação do job `pg_cron`

### Detalhes técnicos
- O problema principal não está na criação do lembrete, e sim na **ausência do agendador**.
- Para “ver rápido” em segundos, a solução correta é **modo de teste + invocação manual da função**.
- Para produção, o comportamento continuará sendo **execução por minuto**, então o envio real pode ocorrer até ~59s depois do horário agendado.
