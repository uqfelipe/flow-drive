

## Corrigir envio automático de lembretes

### Problema identificado

O `useEffect` do auto-processo tem dois bugs:

1. **Depende de `reminders` e `processReminders` no array de dependências** — isso faz o efeito reiniciar (destruir e recriar o interval) toda vez que a lista de lembretes muda ou a mutation muda de estado. Quando o efeito reinicia, ele verifica os dados atuais, mas o timing do interval é resetado.

2. **Verifica dados do cliente antes de chamar a Edge Function** — o `reminders?.some(r => r.status === "pending" && isOverdue(r.scheduled_at))` usa dados em cache do React Query. Se o lembrete foi criado com horário futuro, os dados não mudam sozinhos quando o horário chega — o array `reminders` continua o mesmo objeto até o próximo refetch. Resultado: a verificação retorna `false` e o auto-processo não dispara.

### Solução

Simplificar: quando o auto-envio está ativo, chamar a Edge Function incondicionalmente a cada 10 segundos. A Edge Function já filtra por `status = 'pending' AND scheduled_at <= now()`, então a verificação client-side é redundante e causa o bug.

### Alterações em `src/pages/Reminders.tsx`

1. Reescrever o `useEffect` do auto-processo:
   - Remover `reminders` e `processReminders` do array de dependências
   - Usar refs para acessar `processReminders` sem causar restart do efeito
   - Remover a verificação `hasOverdue` client-side — delegar tudo para a Edge Function
   - Manter o interval estável com dependência apenas em `autoEnabled`

2. Adicionar `refetchInterval: 10000` na query de reminders (no hook) para manter a lista visual atualizada enquanto o auto está ativo

### Alteração em `src/hooks/use-reminders.ts`

- Não precisa de mudança estrutural. Opcionalmente, aceitar um parâmetro `refetchInterval` dinâmico, mas como o `useReminders` já é usado na página, basta adicionar um `refetchInterval` fixo curto (10s) para manter a UI em sincronia.

### Resumo

| O que | Onde |
|-------|------|
| Remover deps instáveis do useEffect, usar refs | `src/pages/Reminders.tsx` |
| Chamar Edge Function incondicionalmente a cada 10s | `src/pages/Reminders.tsx` |
| Adicionar refetchInterval para atualizar lista | `src/hooks/use-reminders.ts` |

