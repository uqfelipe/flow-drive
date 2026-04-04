

## Corrigir Enquete — usar `/send/menu` com campo `choices`

### Causa raiz

Segundo a documentação da uazapi (linhas 5057-5086), enquetes são enviadas via **`/send/menu`** com `type: "poll"` e o campo **`choices`** (array de strings). O código atual:

1. Tenta `/send/poll` que **não existe** (retorna 405)
2. No fallback, chama `sendWhatsAppMenu` passando `{ options, selectableCount }` — mas a API espera o campo **`choices`**, não `options`

### Correção

**`supabase/functions/whatsapp-webhook/index.ts`** — bloco poll (linhas 614-632):

Remover a tentativa de `/send/poll` e chamar diretamente `sendWhatsAppMenu` com o campo correto:

```typescript
if (nt === "poll") {
  const question = cfg.question || "Enquete";
  const options = (cfg.options || []) as string[];
  if (options.length >= 2) {
    try {
      await sendWhatsAppMenu(inst, phone, "poll", replaceVariables(question, vars), { 
        choices: options, 
        selectableCount: cfg.selectableCount || 1 
      });
    } catch (_) {
      const fallback = options.map((o: string, i: number) => `${i + 1}. ${o}`).join("\n");
      try { await sendWhatsAppText(inst, phone, replaceVariables(`${question}\n\n${fallback}`, vars)); } catch (_) {}
    }
  }
  // ... rest stays the same (waiting logic)
}
```

Payload resultante para a API:
```json
{
  "number": "5511999999999",
  "type": "poll",
  "text": "Qual horário prefere?",
  "choices": ["Manhã", "Tarde", "Noite"],
  "selectableCount": 1
}
```

Isso é exatamente o formato documentado pela uazapi.

