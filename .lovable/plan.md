

# Implementacao completa de midias no chat WhatsApp

## Analise da API (uazapi)

**Tipos de midia suportados pela API:**
- `image` — JPG, PNG
- `video` — MP4
- `audio` / `ptt` (push-to-talk) / `myaudio` — MP3, OGG
- `document` — PDF, DOCX, XLSX, etc.
- `sticker` — WebP
- `contact` — vCard
- `location` — coordenadas

**Campos relevantes do payload de mensagem (Message schema):**
- `messageType`: tipo da mensagem (image, video, audio, ptt, document, sticker, location, contact, etc.)
- `text`: texto/caption da mensagem
- `content`: objeto bruto com detalhes (mimetype, fileName, caption, url, etc.)
- `fileURL`: URL do arquivo de midia (gerada pela API)
- `fromMe`: se foi enviada pelo usuario

**Endpoint unificado de envio:** `POST /send/media` com `{number, type, file, text?, docName?}`

---

## Plano de implementacao

### 1. Edge Function — adicionar action `send-media` (`supabase/functions/whatsapp-chat/index.ts`)

Adicionar handler para `action === "send-media"` que chama `/send/media` com `{number, type, file, text, docName}`. Isso substitui a necessidade de endpoints separados para cada tipo de midia.

### 2. Hook — adicionar `useSendMedia` e melhorar `extractContent` (`src/hooks/use-chat.ts`)

- Adicionar mutation `useSendMedia` que envia `{phone, type, fileUrl, text?, docName?}` via `chatAction("send-media", ...)`.
- A interface `WhatsAppMessage` ja tem `fileURL` e `type`, suficiente para a renderizacao.

### 3. Frontend — renderizacao completa de midias (`src/pages/Conversations.tsx`)

**Melhorar `extractContent`** para retornar mais dados:
- `fileName` (nome do documento)
- `mimetype`
- `fileUrl` (URL do arquivo, sempre disponivel)

**Renderizar por tipo dentro do bubble de mensagem:**

| Tipo | Renderizacao |
|------|-------------|
| **image** | `<img>` clicavel com lightbox, caption abaixo |
| **video** | `<video controls>` inline com poster/thumbnail, caption abaixo |
| **audio/ptt** | `<audio controls>` com player nativo, estilo compacto |
| **document** | Card com icone FileText, nome do arquivo, botao "Abrir" (`<a target="_blank">`) |
| **sticker** | `<img>` com fundo transparente, tamanho fixo 150px |
| **location** | Card com icone MapPin e link para Google Maps |
| **contact** | Card com icone User e dados |

**Preservar:** timestamp, status (check/double-check), direcao (fromMe), compatibilidade com texto puro.

### 4. Dialog de envio de midia melhorado

Substituir o dialog atual "Enviar Imagem" por um dialog unificado que permite selecionar o tipo de midia (imagem, video, documento, audio) e enviar via `/send/media`.

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/whatsapp-chat/index.ts` | Adicionar handler `send-media` |
| `src/hooks/use-chat.ts` | Adicionar `useSendMedia`, melhorar interface |
| `src/pages/Conversations.tsx` | Renderizacao completa por tipo de midia, dialog de envio unificado |

## Resultado esperado

- Imagens com preview clicavel e lightbox
- Videos com player inline
- Audios com player HTML5
- Documentos com card e botao para abrir/baixar
- Stickers renderizados como imagem
- Caption/legenda sempre visivel quando presente
- Envio de qualquer tipo de midia pelo dialog unificado
- Zero quebra no realtime e compatibilidade total com mensagens existentes

