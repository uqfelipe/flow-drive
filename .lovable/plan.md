

## Enviar áudio como mensagem de voz (PTT) no Flow Builder

### Problema
Atualmente, o nó "Enviar Áudio" envia o áudio com `type: "audio"` na API do WhatsApp. Segundo a documentação da uazapi, para enviar como **mensagem de voz** (aquele balãozinho verde de áudio no WhatsApp), o tipo correto é `type: "ptt"` (push-to-talk).

### Alteração

**1. `supabase/functions/whatsapp-webhook/index.ts`** — linha 454:
- Mudar o mediaType do `send_audio` de `"audio"` para `"ptt"`
- Isso faz com que o áudio chegue no WhatsApp do cliente como mensagem de voz (com ícone de microfone e waveform), não como arquivo de áudio genérico

Antes:
```
nt === "send_audio" ? "audio"
```
Depois:
```
nt === "send_audio" ? "ptt"
```

### Resultado
Todos os áudios enviados pelo nó "Enviar Áudio" no flow builder chegarão como mensagem de voz no WhatsApp do destinatário.

