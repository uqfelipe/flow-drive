

## Corrigir captura de imagem no fluxo WhatsApp

### Problema raiz
Quando o usuário envia uma imagem no WhatsApp, o uazapi envia **dois eventos**:
1. `EventType=messages` — chega primeiro, mas **sem URL de mídia** (arquivo ainda encriptado)
2. `EventType=messages_update` com `Type=FileDownloaded` — chega ~25s depois, **com a URL do arquivo**

O código atual, ao receber o evento 1, detecta `capture_image` sem `mediaUrl` e envia "❌ Por favor, envie um arquivo válido" — **rejeitando a imagem prematuramente**. Quando o evento 2 chega, ele tenta processar mas o fluxo já enviou a mensagem de erro.

### Solução

**`supabase/functions/whatsapp-webhook/index.ts`** — 3 alterações:

1. **Detectar imagem no evento inicial mesmo sem URL**: No `extractIncomingMessages`, checar se o payload tem indicadores de imagem (`imageMessage`, `type=image`, `mimetype=image/*`) mesmo sem URL. Marcar `mediaType="image"` para que o filtro `valid` não rejeite a mensagem.

2. **Não rejeitar imagem na captura — aguardar FileDownloaded**: No bloco `capture_image` dentro de `processFlow` (linhas 241-279), quando `isMediaCapture && !incomingMediaUrl` **mas** `incomingMediaType === "image"` (ou audio/file), NÃO enviar "❌". Em vez disso, salvar o estado como "waiting" **silenciosamente** e retornar — aguardando o evento `FileDownloaded` trazer a URL.

3. **FileDownloaded deve fazer re-host e sync completo**: O handler de `messages_update` (linhas 922-958) já chama `processIncomingMessage` com a `fileUrl`. Quando isso chega, a sessão estará em "waiting" no nó `capture_image`. O `processFlow` vai executar o bloco de mídia com `incomingMediaUrl` preenchida, fazer `downloadAndRehost` → imgbb, salvar em `customer_files`, sync em `custom_fields`, e avançar o fluxo.

### Mudanças específicas

```text
processFlow (linha ~274):
  ANTES: if (isMediaCapture && !incomingMediaUrl) → envia "❌ envie arquivo válido"
  DEPOIS: if (isMediaCapture && !incomingMediaUrl && !incomingMediaType) → envia "❌"
           if (isMediaCapture && !incomingMediaUrl && incomingMediaType) → aguarda silenciosamente

extractIncomingMessages (linha ~975):
  ANTES: if (!text && !mediaUrl && !mediaType) return false;
  DEPOIS: (sem mudança — mediaType já é setado pelo mime detection)
```

### Fluxo corrigido
```text
Usuário envia foto no WhatsApp
  → Evento 1 (messages): tipo=image detectado por mimetype, mediaUrl=""
  → processFlow capture_image: mediaType="image" mas sem URL → aguarda silenciosamente
  → Sessão fica "waiting" no nó capture_image
  
  ~25s depois...
  
  → Evento 2 (FileDownloaded): fileUrl="https://ipazua.uazapi.com/files/xxx.png"
  → processIncomingMessage com mediaUrl preenchida
  → Resume sessão "waiting" no capture_image
  → downloadAndRehost → imgbb → URL permanente
  → vars[foto] = URL imgbb
  → customer_files.insert
  → custom_fields sync: {foto: "https://i.ibb.co/xxx"}
  → Avança para próximo nó do fluxo
```

### Arquivo modificado
- `supabase/functions/whatsapp-webhook/index.ts`

