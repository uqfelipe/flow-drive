

## Problema
O nó `copy_paste` (ID 106/108) está enviando o texto como mensagem simples via `/send/text`. Deveria enviar como botão com ação de copiar, igual ao Pix.

## Solução
Alterar o handler do nó `copy_paste` para usar `/send/menu` com `type: "button"` e `choices` no formato `"label|copy:valor"`.

### Mudança no código (linhas 222-227)

De:
```typescript
if (nt === "copy_paste") {
  const msg = cfg.text || "";
  if (msg) { try { await sendWhatsAppText(inst, phone, replaceVariables(msg, vars)); } catch (_) {} }
  nodeId = findNextNodeId(flowEdges, nodeId);
  continue;
}
```

Para:
```typescript
if (nt === "copy_paste") {
  const textToCopy = cfg.text || cfg.content || "";
  const label = cfg.label || cfg.buttonText || "Copiar";
  const msg = cfg.message || "";
  if (textToCopy) {
    try {
      await waFetch(inst, "/send/menu", {
        number: phone,
        type: "button",
        text: replaceVariables(msg || textToCopy, vars),
        choices: [`${replaceVariables(label, vars)}|copy:${replaceVariables(textToCopy, vars)}`],
      });
    } catch (_) {
      // Fallback: texto simples
      try { await sendWhatsAppText(inst, phone, replaceVariables(textToCopy, vars)); } catch (_2) {}
    }
  }
  nodeId = findNextNodeId(flowEdges, nodeId);
  continue;
}
```

### Arquivo alterado
- `supabase/functions/whatsapp-webhook/index.ts` — Trocar `sendWhatsAppText` por `/send/menu` com `choices: ["Copiar|copy:valor"]`

### Resultado
O nó Copia e Cola enviará um botão interativo que copia o texto ao clicar, em vez de uma mensagem de texto simples.

