

## Corrigir envio de figurinhas — endpoint errado

### Problema raiz

O endpoint `/send/sticker` **não existe** na API uazapi (retorna 405 Method Not Allowed). O endpoint correto é `/send/media` com `type: "sticker"`, conforme já usado no `whatsapp-chat/index.ts` (linha 98: `// image, video, audio, ptt, document, sticker`).

### Correção

**`supabase/functions/whatsapp-webhook/index.ts`** — Uma única mudança:

Alterar a função `sendWhatsAppSticker` (linha 64-66) de:
```typescript
async function sendWhatsAppSticker(inst: Inst, phone: string, file: string) {
  await waFetch(inst, "/send/sticker", { number: phone, file });
}
```

Para:
```typescript
async function sendWhatsAppSticker(inst: Inst, phone: string, file: string) {
  await waFetch(inst, "/send/media", { number: phone, type: "sticker", file });
}
```

Depois, re-deploy da edge function `whatsapp-webhook`.

### Por que vai funcionar agora

- O `whatsapp-chat` já usa `/send/media` com `type: "sticker"` com sucesso
- Os erros antigos de "failed to convert audio to OGG" eram do nó `send_audio` (tipo `audio` com arquivo .mpeg), não do sticker
- O arquivo configurado no nó sticker é um PNG válido do Supabase Storage

