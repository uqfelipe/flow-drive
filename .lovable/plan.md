

## Expirar sessão e reiniciar fluxo automaticamente

### Problema
Quando o fluxo chega num nó final (ex: mensagem do veículo) ou o usuário simplesmente para de responder, a sessão fica com status `waiting` para sempre. Se o cliente voltar horas depois, o sistema tenta continuar de onde parou em vez de recomeçar do zero.

### Solução
Adicionar um **timeout de inatividade** na busca de sessão existente. Quando o webhook encontra uma sessão `active`/`waiting`, verificar o `updated_at`: se passou mais de X minutos (configurável, padrão 30 min), considerar a sessão expirada, marcá-la como `completed` e iniciar uma nova do zero.

### Alteração

#### `supabase/functions/whatsapp-webhook/index.ts`

**1. Após encontrar a sessão existente (linha ~1328-1330)**, adicionar verificação de timeout:

```typescript
let session = existingSessions?.[0];

// Se a sessão existe mas está inativa há mais de 30 minutos, expirar
if (session) {
  const lastUpdate = new Date(session.updated_at).getTime();
  const now = Date.now();
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  
  if (now - lastUpdate > SESSION_TIMEOUT_MS) {
    console.log(`[AUTO-REPLY] Session expired (inactive ${Math.round((now - lastUpdate) / 60000)}min), restarting`);
    await adminClient.from("chat_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", session.id);
    session = undefined; // forçar criação de nova sessão
  }
}
```

Isso faz com que, se o cliente voltar depois de 30 minutos sem interação, o fluxo reinicie do começo automaticamente. Se voltar antes de 30 min, continua de onde parou.

### Resultado
- Cliente sai e volta em 5 min → continua de onde parou
- Cliente sai e volta em 2 horas → fluxo recomeça do zero, como se fosse nova conversa

