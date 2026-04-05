

## Corrigir envio de figurinhas (send_sticker)

### Problema identificado

Nos logs do webhook, ao processar o nó `send_sticker`, o erro é:
```
"failed to process file: failed to convert audio to OGG: FFmpeg failed on attempt 3: exit status 183"
```

O código atual (linha 459 do webhook) envia figurinhas via `/send/media` com `type: "sticker"`, mas a API uazapi não suporta esse tipo no endpoint `/send/media` e tenta processar o arquivo como áudio.

### Correção

#### 1. Webhook — usar endpoint dedicado `/send/sticker`

**`supabase/functions/whatsapp-webhook/index.ts`**:

- Criar nova função `sendWhatsAppSticker(inst, phone, file)` que chama `/send/sticker` com `{ number, file }`
- Separar `send_sticker` do bloco genérico de mídia (linha 456) para usar a nova função dedicada
- Tratar o nó `send_sticker` em bloco próprio antes do bloco de mídia genérico

#### 2. Frontend — adicionar upload no painel de configuração

**`src/components/flow-builder/NodeConfigPanel.tsx`**:

- Substituir o campo simples de URL por interface com abas (Link / Upload), igual imagem/vídeo/arquivo
- Upload para o bucket `audio-files` do Supabase Storage
- Validação: aceitar apenas imagens (idealmente WebP, mas aceitar PNG/JPG que a API converte)
- Limite de 1MB (stickers são pequenos)
- Preview da imagem quando URL estiver preenchida

### Detalhes técnicos

Nova função no webhook:
```typescript
async function sendWhatsAppSticker(inst: Inst, phone: string, file: string) {
  await waFetch(inst, "/send/sticker", { number: phone, file });
}
```

Bloco separado no `processFlow`:
```typescript
if (nt === "send_sticker") {
  const file = cfg.file || "";
  if (file) {
    try { await sendWhatsAppSticker(inst, phone, replaceVariables(file, vars)); } 
    catch (e) { console.error(`[FLOW]`, e.message); }
    await new Promise(r => setTimeout(r, 500));
  }
  nodeId = findNextNodeId(flowEdges, nodeId);
  continue;
}
```

