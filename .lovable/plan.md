

## Corrigir processamento do FileDownloaded no webhook

### Problemas identificados

1. **Background task é cancelada antes de completar**: O handler `FileDownloaded` (linhas 951-960) coloca o processamento em uma `bgTask` e retorna a response imediatamente. No Supabase Edge Functions, `waitUntil` não existe — a condição `globalThis.EdgeRuntime` é `undefined`, e `ctx?.waitUntil` também não existe. O `catch` faz `await bgTask`, mas o runtime já encerrou a função (os logs mostram `shutdown` logo após o evento). O processamento nunca completa.

2. **Stack overflow em imagens grandes**: `btoa(String.fromCharCode(...buf))` na linha 103 estoura o stack para imagens maiores que ~100KB porque faz spread de todo o array como argumentos de função.

3. **Re-download desnecessário**: O `FileDownloaded` já traz a URL do arquivo (`FileURL`), mas o código chama `downloadAndRehost` que faz outro `/message/download`. Pode usar a URL direta para upload ao imgbb.

### Solução

**`supabase/functions/whatsapp-webhook/index.ts`** — 3 alterações:

1. **FileDownloaded: processar ANTES de retornar a response** — Remover o padrão `bgTask`/`waitUntil`. Fazer `await processIncomingMessage(...)` diretamente antes do `return`, garantindo que o processamento complete antes do runtime encerrar.

2. **Corrigir conversão base64 para imagens grandes** — Substituir `btoa(String.fromCharCode(...buf))` por um loop chunked que não estoura o stack:
   ```typescript
   let binary = "";
   const chunkSize = 8192;
   for (let i = 0; i < buf.length; i += chunkSize) {
     binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
   }
   const b64 = btoa(binary);
   ```

3. **Otimizar re-host no FileDownloaded** — Quando `processFlow` recebe a `mediaUrl` do FileDownloaded (URL direta do uazapi), fazer `uploadToImgbbFromUrl(incomingMediaUrl)` diretamente em vez de chamar `downloadAndRehost` (que faz outro request desnecessário ao `/message/download`). O `downloadAndRehost` via messageId continua como fallback quando a URL direta não está disponível.

### Fluxo corrigido
```text
FileDownloaded chega
  → Handler extrai FileURL diretamente
  → await processIncomingMessage (síncrono, sem bgTask)
  → Sessão "waiting" no capture_image é encontrada
  → processFlow recebe mediaUrl = FileURL do uazapi
  → uploadToImgbbFromUrl(mediaUrl) direto (sem re-download)
  → URL permanente imgbb salva em vars, customer_files, custom_fields
  → Fluxo avança
```

### Arquivo modificado
- `supabase/functions/whatsapp-webhook/index.ts`

