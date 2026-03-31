

# Fix: Prévia da última mensagem não aparecendo na lista de conversas

## Problema

Na linha 341-345 de `Conversations.tsx`, quando `wa_lastMsg` é um objeto, o código tenta extrair `.text` ou `.caption`. Se nenhum desses campos existir (ex: mensagem de áudio, imagem sem caption, ou estrutura diferente da esperada), o resultado é string vazia — e nada aparece.

## Solução

**`src/pages/Conversations.tsx`** — melhorar a função de extração da prévia para cobrir mais formatos:

```typescript
function chatPreview(msg: any): string {
  if (!msg) return "";
  if (typeof msg === "string") return msg;
  if (typeof msg !== "object") return String(msg);
  
  // Try common fields
  const text = msg.text ?? msg.caption ?? msg.body ?? msg.conversation ?? "";
  if (text) return text;
  
  // Media fallbacks
  if (msg.mimetype?.startsWith("image") || msg.imageMessage) return "📷 Imagem";
  if (msg.mimetype?.startsWith("video") || msg.videoMessage) return "🎥 Vídeo";
  if (msg.mimetype?.startsWith("audio") || msg.audioMessage) return "🎵 Áudio";
  if (msg.documentMessage || msg.fileName) return `📄 ${msg.fileName || "Documento"}`;
  if (msg.stickerMessage) return "🏷️ Sticker";
  if (msg.contactMessage) return "👤 Contato";
  if (msg.locationMessage) return "📍 Localização";
  
  // Last resort: stringify and check
  const str = JSON.stringify(msg);
  if (str.length > 2 && str.length < 100) return str;
  return "[mídia]";
}
```

Substituir as linhas 341-345 por:
```typescript
{chatPreview(chat.wa_lastMsg) || formatPhone(phoneFromChatId(chat.wa_chatid))}
```

**Arquivo alterado:** apenas `src/pages/Conversations.tsx` — uma nova função helper + 1 linha na renderização.

