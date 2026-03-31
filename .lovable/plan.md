

# Plano: Suporte para envio e visualização de imagens inline no chat

## O que será feito

Permitir que imagens sejam exibidas inline nas bolhas de mensagem e que o usuário possa enviar imagens via URL pelo chat.

## 1. Edge Function — novo action `send-image`

**Arquivo**: `supabase/functions/whatsapp-chat/index.ts`

Adicionar action `send-image` que chama `POST /send/image` da uazapi:
```typescript
if (action === "send-image") {
  const data = await apiCall(inst.server_url, inst.instance_token, "/send/image", {
    number: phone,
    file: imageUrl,  // URL da imagem
    text: text || "", // caption opcional
  });
  return json(data);
}
```

Também extrair `imageUrl` do body do request junto com `phone`, `text`, `imageUrl`.

## 2. Hook — adicionar mutation de envio de imagem

**Arquivo**: `src/hooks/use-chat.ts`

- Adicionar `useSendImage()` mutation que invoca `action: "send-image"` com `{ phone, imageUrl, text }`.

## 3. Frontend — visualização inline de imagens

**Arquivo**: `src/pages/Conversations.tsx`

### Exibir imagens nas bolhas
- Na renderização de mensagens, quando `msgType === "image"`, extrair a URL da imagem de `msg.fileURL` ou `(msg.content as any)?.url` ou `(msg.content as any)?.fileURL`.
- Renderizar um `<img>` clicável dentro da bolha, com cantos arredondados e aspect-ratio automático.
- Ao clicar na imagem, abrir no lightbox já existente (reutilizar `lightboxImg`).
- Exibir caption (se houver) abaixo da imagem na bolha.

### Enviar imagens
- Tornar o botão de `Paperclip` funcional: ao clicar, abrir um prompt/dialog simples para colar URL de imagem + caption opcional.
- Usar `useSendImage()` para enviar.
- Alternativa mais simples: usar um `<input type="file">` hidden, converter para base64 data URI e enviar como `file` (a uazapi aceita base64).

### Atualizar `WhatsAppMessage` interface
- Adicionar `fileURL?: string` ao tipo.
- Atualizar `extractContent` para retornar a URL da mídia quando disponível.

## Detalhes técnicos

- A uazapi retorna `fileURL` nas mensagens com mídia — é a URL direta do arquivo
- O endpoint `/send/image` aceita `file` como URL pública ou base64
- O lightbox existente será reutilizado para visualização em tela cheia
- Imagens terão `max-width: 280px` dentro das bolhas, com lazy loading

