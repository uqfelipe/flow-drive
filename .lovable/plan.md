

## Corrigir detecção de imagem no webhook — diagnóstico + fix robusto

### Problema confirmado

Os logs mostram claramente:
- **09:21:44** — Flow chega no nó `capture_image` (node 135), sessão fica `waiting`
- **09:21:50** — Imagem chega: `extracted=1 valid=0` — imagem detectada mas **filtrada como inválida**
- **Nenhum evento `FileDownloaded`** jamais chegou
- A sessão permanece em `waiting` no nó 135 indefinidamente
- O `custom_fields` do cliente tem apenas `{comida: "fgf"}` — **sem `foto`**
- `customer_files` está vazio para esse cliente

### Causa raiz

O `extractIncomingMessages` (linhas 833-857) verifica:
- `msg.mimetype` / `msg.mimeType` — uazapi **não** coloca mimetype no nível root da mensagem
- `msg.type === "image"` — uazapi pode usar outro valor ou case diferente
- `msg.message.imageMessage` — pode não existir no formato uazapi
- `msg.mediatype` — pode não existir

O que uazapi **provavelmente** envia:
- `msg.content` como objeto com `mimetype` (similar ao que `Conversations.tsx` usa via `c?.mimetype?.startsWith("image")`)
- `msg.type` como string tipo `"image"`, `"Image"`, ou similar  
- O conteúdo da mídia fica dentro de `msg.content` ou campos específicos

### Solução — `supabase/functions/whatsapp-webhook/index.ts`

**1. Adicionar log de diagnóstico quando `valid=0`** (temporário mas essencial):
```typescript
// Após o filter, se valid=0 mas extracted>0:
if (validMessages.length === 0 && incomingMessages.length > 0) {
  for (const m of incomingMessages) {
    console.log(`[WEBHOOK] FILTERED msg: fromMe=${m.fromMe} text="${m.text?.substring(0,30)}" mediaType=${m.mediaType} mediaUrl=${m.mediaUrl?.substring(0,50)} phone=${m.phone}`);
  }
}
```

**2. Expandir detecção de mimetype** no `extractIncomingMessages`:
```typescript
// Linha 835 — adicionar mais fontes de mimetype:
const contentObj = typeof msg.content === "object" ? msg.content : null;
const mimetype = (
  msg.mimetype || msg.mimeType || msg.MimeType ||
  contentObj?.mimetype || contentObj?.mimeType ||
  msgContent.imageMessage?.mimetype ||
  msgContent.audioMessage?.mimetype ||
  msgContent.documentMessage?.mimetype ||
  msgContent.videoMessage?.mimetype ||
  ""
).toString();
```

**3. Expandir detecção de tipo** na condição de image:
```typescript
// Linha 841 — adicionar checagem de msg.type case-insensitive e content.mimetype:
const msgTypeLower = (msg.type || msg.Type || "").toString().toLowerCase();

if (msgContent.imageMessage || msgTypeLower === "image" || msg.mediatype === "image" 
    || detectedTypeByMime === "image") {
```

**4. Adicionar log do raw message** quando é mídia para debug:
```typescript
// Antes do filtro de mídia, loggar keys do msg para entender o formato
console.log(`[WEBHOOK] msg keys=${Object.keys(msg).join(",")} type=${msg.type} mimetype=${mimetype} content_type=${typeof msg.content} content_keys=${contentObj ? Object.keys(contentObj).join(",") : "n/a"}`);
```

### Arquivo modificado
- `supabase/functions/whatsapp-webhook/index.ts` — 4 alterações na função `extractIncomingMessages` e no handler de mensagens

### Por que isso vai funcionar
O fix anterior separou `mediaType` do `mediaUrl` no spread (linha 867-869), mas o `mediaType` nunca era definido porque nenhuma das condições de detecção (linhas 841-857) matchava. Ao expandir a detecção para incluir `msg.content?.mimetype`, `msg.Type`, e case-insensitive checks, a imagem será reconhecida. O log de diagnóstico vai confirmar exatamente quais campos o uazapi envia.

