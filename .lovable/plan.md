

# Fix: Comparação de timestamps com unidades diferentes

## Problema raiz

Na linha 68-70 de `use-chat.ts`:
```typescript
const readAtSec = new Date(rs.read_at).getTime() / 1000;  // → 1774990648 (segundos)
const lastMsgTs = c.wa_lastMsgTimestamp ?? 0;               // → 1774986655000 (milissegundos)
if (readAtSec >= lastMsgTs) // 1774990648 >= 1774986655000 → SEMPRE FALSE
```

A API retorna `wa_lastMsgTimestamp` em **milissegundos** (13 dígitos). O código converte `read_at` para segundos dividindo por 1000. Resultado: a comparação nunca é verdadeira, então o `wa_unreadCount` nunca é zerado após reload.

## Solução

**`src/hooks/use-chat.ts`** — comparar ambos em milissegundos (remover a divisão por 1000):

```typescript
const readAtMs = new Date(rs.read_at).getTime();        // milissegundos
const lastMsgTs = c.wa_lastMsgTimestamp ?? 0;            // milissegundos (da API)
if (readAtMs >= lastMsgTs) {
  return { ...c, wa_unreadCount: 0 };
}
```

Uma única linha alterada. Nenhum outro arquivo precisa mudar.

