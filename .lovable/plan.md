

## Parar o bot imediatamente ao desativar o fluxo

### Problema
Quando o fluxo é desativado (status muda de "active" para "draft"), o webhook continua enviando mensagens porque:
1. O fluxo ativo fica em cache por 30 segundos (`FLOW_CACHE_TTL = 30_000`)
2. Sessões existentes (`chat_sessions`) com status "active"/"waiting" continuam sendo processadas mesmo sem fluxo ativo

### Solução

**Arquivo: `supabase/functions/whatsapp-webhook/index.ts`**

1. **Reduzir cache TTL para 5 segundos** — diminuir `FLOW_CACHE_TTL` de 30s para 5s para que a desativação seja percebida mais rapidamente.

2. **Validar status do fluxo na sessão existente** — antes de processar uma sessão existente (linha ~1370), verificar se o `flow_id` da sessão ainda corresponde a um fluxo ativo. Se não, marcar a sessão como "completed" e não processar.

3. **Invalidar cache quando o fluxo muda** — ao buscar o fluxo do cache, comparar o `id` do fluxo cached com o `flow_id` da sessão. Se o fluxo da sessão foi desativado, encerrar a sessão.

### Detalhes técnicos

Na função `processIncomingMessage`, após buscar o fluxo ativo (linha 1298), adicionar verificação:
- Se `flow` é `null` e existe uma sessão ativa, marcar a sessão como "completed" e retornar sem enviar mensagens
- Se `flow` existe mas o `flow_id` da sessão é diferente do fluxo ativo atual, encerrar a sessão antiga e iniciar uma nova (ou simplesmente encerrar)

Trecho principal da mudança (~linha 1298-1303):
```
const flow = await getActiveFlowCached();

if (!flow) {
  // Se não há fluxo ativo, encerrar qualquer sessão existente
  if (session) {
    await adminClient.from("chat_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", session.id);
    console.log("[AUTO-REPLY] Flow deactivated, session completed");
  }
  console.log("[AUTO-REPLY] No active flow found");
  return;
}
```

E reduzir o TTL do cache (linha 1008):
```
const FLOW_CACHE_TTL = 5_000; // 5s
```

