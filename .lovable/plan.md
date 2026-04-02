

## Problema

O `send_link` está tentando `/send/buttons` e `/send/cta-url` — ambos retornam **405 Method Not Allowed**. Esses endpoints não existem na API uazapi. O endpoint correto é `/send/menu` com `type: "button"`.

## Solução

Alterar o handler do nó `send_link` em `supabase/functions/whatsapp-webhook/index.ts` para usar o formato correto da API:

```json
{
  "number": "5511999999999",
  "type": "button",
  "text": "Mensagem opcional",
  "choices": ["Texto do botão|url:https://exemplo.com"]
}
```

### Mudança no código (linhas 177-206)

Substituir as 3 tentativas (buttons → cta-url → text) por uma única chamada a `/send/menu`:

```typescript
if (nt === "send_link") {
  const url = cfg.url || "";
  const label = cfg.label || cfg.buttonText || "Acessar link";
  const msg = cfg.message || "";
  if (url) {
    try {
      await waFetch(inst, "/send/menu", {
        number: phone,
        type: "button",
        text: replaceVariables(msg || "Acesse o link abaixo:", vars),
        choices: [`${replaceVariables(label, vars)}|url:${replaceVariables(url, vars)}`],
      });
    } catch (_) {
      // Fallback: plain text with URL
      const fallbackMsg = msg ? `${msg}\n\n🔗 ${url}` : url;
      try { await sendWhatsAppText(inst, phone, replaceVariables(fallbackMsg, vars)); } catch (_2) {}
    }
  }
  nodeId = findNextNodeId(flowEdges, nodeId);
  continue;
}
```

### Arquivo alterado
- `supabase/functions/whatsapp-webhook/index.ts` — Trocar `/send/buttons` + `/send/cta-url` por `/send/menu` com `type: "button"` e `choices` no formato `"label|url:https://..."`.

### Resultado
O link será enviado como **botão clicável** no WhatsApp, usando o endpoint correto da API uazapi.

