

## Problema
Ao reconectar o WhatsApp, a API dispara uma enxurrada de mensagens pendentes (históricas + grupos). Cada mensagem faz uma query separada ao banco para buscar o fluxo ativo. Isso sobrecarrega o banco, causando timeouts (Error 522), e o código interpreta o erro como "No active flow found."

Nos logs: dezenas de "No active flow found" por segundo, incluindo mensagens de grupos (`120363...`, `205497...`) e mensagens próprias da API (`18002428478`).

## Solução

### 1. Filtrar mensagens de grupo e status no webhook
Antes de processar, ignorar:
- Mensagens de grupos (`@g.us` no chatId, ou IDs com mais de 15 dígitos)
- Mensagens sem texto
- Mensagens próprias (`fromMe`)

### 2. Cachear o fluxo ativo em memória
Em vez de cada mensagem fazer uma query ao banco, buscar o fluxo **uma vez** e reutilizar durante a vida da instância da Edge Function (~30s).

```text
let cachedFlow = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30s

async function getActiveFlow() {
  if (cachedFlow && Date.now() - cacheTime < CACHE_TTL) return cachedFlow;
  const { data, error } = await query...
  if (error) { console.error(...); return null; }
  cachedFlow = data?.[0] ?? null;
  cacheTime = Date.now();
  return cachedFlow;
}
```

### 3. Processar mensagens em série com limite
Em vez de disparar todas em paralelo (e sobrecarregar o banco), processar no máximo 5 mensagens por invocação do webhook, ignorando o resto.

### 4. Logar erros do banco corretamente
Capturar `error` da query e logar em vez de silenciar.

## Arquivos alterados
- `supabase/functions/whatsapp-webhook/index.ts` — Cache de fluxo, filtro de grupos, limite de processamento, log de erros

## Resultado
- Bot responde múltiplos usuários sem sobrecarregar o banco
- Mensagens de grupo são ignoradas
- Reconexão não causa flood de queries
- Erros do banco ficam visíveis nos logs
