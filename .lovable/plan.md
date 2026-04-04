

## Corrigir perda de imagens no webhook: dois bugs

### Diagnóstico dos logs

1. **09:16:38** — Flow chega no nó `capture_image` (node 135), envia "qual sua foto", sessão fica "waiting"
2. **09:16:44** — Imagem chega: `extracted=1 valid=0` — imagem foi **detectada** mas **filtrada como inválida**
3. **09:17:24** — Próximo log é um evento "chats", sem nenhum `FileDownloaded` no meio
4. **Nenhum log de `FileDownloaded`** — o evento nunca chegou ou chegou com formato diferente

### Bug 1: `mediaType` descartado quando `mediaUrl` está vazio

Na linha 866-868 do `extractIncomingMessages`:
```typescript
...(mediaUrl ? { mediaUrl, mediaType, mediaFileName } : {}),
```
Quando a imagem chega sem URL (uazapi ainda decriptando), `mediaUrl=""` é falsy, então `mediaType` NÃO é incluído no objeto. O filtro na linha 996 vê `!text && !mediaUrl && !mediaType` = true e descarta a mensagem.

**Correção**: Sempre incluir `mediaType` independente de `mediaUrl`:
```typescript
...(mediaUrl ? { mediaUrl } : {}),
...(mediaType ? { mediaType } : {}),
...(mediaFileName ? { mediaFileName } : {}),
```

### Bug 2: `FileDownloaded` pode não chegar ou ter formato diferente

Os logs mostram que **nenhum** evento `FileDownloaded` chegou nos ~40s após a imagem. Possibilidades:
- uazapi não envia `FileDownloaded` como `messages_update` mas sim como outro `EventType`
- O campo `Type` pode ter case diferente (`filedownloaded` vs `FileDownloaded`)

**Correção**: Adicionar case-insensitive check no handler de `messages_update` e também detectar `FileDownloaded` em qualquer `EventType` (pode vir como evento de nível root):
```typescript
const evtType = (evt.Type || evt.type || body.state || body.type || "").toString().toLowerCase();
if (evtType === "filedownloaded") { ... }
```

E adicionar log extra para qualquer `messages_update` que tenha `FileURL`:
```typescript
if (body.FileURL || evt.FileURL) {
  console.log("[WEBHOOK] Found FileURL in event:", body.FileURL || evt.FileURL);
}
```

### Resumo das alterações

**`supabase/functions/whatsapp-webhook/index.ts`** — 3 mudanças:

1. **Linha 866-868**: Separar spread de `mediaType` do `mediaUrl` para que imagens sem URL ainda sejam reconhecidas como tipo "image"
2. **Linha 949-950**: Case-insensitive comparison para `FileDownloaded` e buscar `FileURL` em mais campos do body
3. **Após linha 980**: Adicionar fallback para detectar `FileDownloaded` como `EventType` de nível root (não só dentro de `messages_update`), caso uazapi envie assim

### Fluxo após correção
```text
Imagem chega (sem URL):
  → extractIncomingMessages: mediaType="image", mediaUrl=""
  → Filtro válido: mediaType presente → NÃO filtra
  → processFlow capture_image: sem URL mas mediaType="image" → aguarda silenciosamente
  → Sessão fica "waiting"

FileDownloaded chega (~25s depois):
  → Detectado por case-insensitive check
  → await processIncomingMessage (síncrono)
  → Re-host imgbb → URL permanente
  → Salva em vars, customer_files, custom_fields
```

