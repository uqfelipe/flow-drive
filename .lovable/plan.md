

# Chat list preview estilo WhatsApp

## O que mudar

Na lista de conversas (linhas 354-360 de `Conversations.tsx`), adicionar antes do texto de prévia:
- **Ícone de check** (✓ ou ✓✓) quando a última mensagem foi enviada por você (`fromMe`)
- Manter os ícones de mídia (📷, 🎵, 📄, etc.) já existentes no `chatPreview`

## Alterações em `src/pages/Conversations.tsx`

**1. Atualizar `chatPreview`** para retornar também se é `fromMe`:

```typescript
function chatPreviewData(msg: any): { text: string; fromMe?: boolean } {
  if (!msg) return { text: "" };
  if (typeof msg === "string") return { text: msg };
  if (typeof msg !== "object") return { text: String(msg) };
  
  const fromMe = msg.fromMe ?? undefined;
  const text = msg.text ?? msg.caption ?? msg.body ?? msg.conversation ?? "";
  if (text) return { text, fromMe };
  // ... same media fallbacks as current chatPreview
  return { text: "[mídia]", fromMe };
}
```

**2. Renderizar checks + prévia** (linhas 354-360):

```tsx
<div className="flex items-center justify-between gap-2 mt-0.5">
  <p className={cn("text-[11px] truncate leading-relaxed flex items-center gap-0.5", ...)}>
    {preview.fromMe && (
      <CheckCheck className="h-3 w-3 shrink-0 text-blue-400" />
    )}
    <span className="truncate">{preview.text || formatPhone(...)}</span>
  </p>
  {/* badge não lida */}
</div>
```

Resultado: a prévia mostra `✓✓ Oiê! Pra gente continuar...` para mensagens enviadas, igual ao WhatsApp.

