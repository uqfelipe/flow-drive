

## Corrigir captura de imagens do WhatsApp no fluxo e exibição no cliente

### Problemas identificados

1. **Imagem não é processada no webhook**: Os logs mostram `extracted=1 valid=0` — a mensagem de imagem foi recebida mas filtrada como inválida. O campo `mediaUrl` fica vazio porque o uazapi envia a URL em campos que o código não verifica (`msg.fileURL`, `msg.content?.url`, `msg.fileUrl`). Como `mediaUrl` fica `""` (falsy), a mensagem é descartada no filtro `!text && !mediaUrl`.

2. **custom_fields sync usa texto em vez de mídia**: Linha 252 do webhook sempre grava `incomingText.trim()` no `custom_fields`, mas para captura de mídia o valor correto está em `vars[varName]` (que contém a URL da mídia). Resultado: campo "foto" nunca é preenchido.

3. **URL da mídia é inacessível**: Mesmo quando extraída, a URL do WhatsApp CDN é criptografada/temporária. Precisa ser baixada via API `/message/download` e re-hospedada no imgbb para ser exibível.

### Alterações

**`supabase/functions/whatsapp-webhook/index.ts`**:

1. **Ampliar extração de mediaUrl** — na função `extractIncomingMessages`, adicionar campos do uazapi: `msg.fileURL`, `msg.fileUrl`, `msg.content?.url`, `msg.content?.fileUrl`, `msg.file`. Também detectar tipo por `msg.mimetype` (ex: `mimetype.startsWith("image")`).

2. **Corrigir sync de custom_fields para mídia** — na linha 252, trocar `incomingText.trim()` por `vars[varName]` para que campos de mídia recebam a URL da mídia.

3. **Download + re-host de mídia** — criar função `downloadAndRehost(inst, messageId)` que:
   - Chama `/message/download` na API uazapi com `return_link: true`
   - Pega a `fileURL` retornada (link temporário acessível)
   - Faz upload ao imgbb via API
   - Retorna a URL permanente do imgbb
   - Chamar esta função no bloco `isMediaCapture` (antes de salvar em `customer_files` e `vars`)

4. **Upload imgbb no servidor** — adicionar função `uploadToImgbb(imageUrl)` que:
   - Faz `fetch` da URL da imagem
   - Converte para base64
   - POST para `https://api.imgbb.com/1/upload`
   - Retorna URL hospedada

### Fluxo corrigido

```text
Usuário envia imagem WhatsApp
  → Webhook recebe (EventType=messages)
  → extractIncomingMessages detecta tipo=image via mimetype/type
  → Extrai mediaUrl de fileURL/content.url (URL temporária)
  → Filtro valida (!text && !mediaUrl → passa agora)
  → processIncomingMessage chamado com mediaUrl
  → No capture_image: downloadAndRehost(inst, msgId)
    → /message/download → link temporário
    → Upload imgbb → URL permanente
  → vars[foto] = URL imgbb permanente
  → customer_files.insert(file_url = URL permanente)
  → custom_fields sync: existing[foto] = vars[foto] (URL permanente)
  → Imagem aparece no CustomerEdit nos Campos e Arquivos
```

### Arquivos modificados
- `supabase/functions/whatsapp-webhook/index.ts` — todas as 4 alterações acima

