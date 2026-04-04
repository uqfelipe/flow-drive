

## Corrigir envio de Menu Lista no webhook

### Problema
A API do WhatsApp (uazapi) espera o campo `choices` como um array plano de strings no formato:
```json
{
  "type": "list",
  "text": "Escolha:",
  "choices": ["[Seção 1]", "Item A|id_a|descrição", "[Seção 2]", "Item B|id_b|descrição"],
  "listButton": "Ver opções"
}
```

Mas o webhook está enviando `sections` como objetos estruturados (`{ sections: [{title, rows: [...]}] }`), que é um campo que a API não reconhece. Por isso só aparece o menu sem os itens.

### Alteração

**`supabase/functions/whatsapp-webhook/index.ts`** — bloco `menu_list` (~linhas 564-577):

Converter as `sections` para o formato `choices` da API antes de enviar:

```typescript
// Converter sections → choices flat array
const choices: string[] = [];
for (const s of sections) {
  choices.push(`[${s.title}]`);
  for (const it of (s.items || s.rows || [])) {
    const parts = [it.title];
    if (it.id || it.rowId) parts.push(it.id || it.rowId);
    if (it.description) parts.push(it.description);
    choices.push(parts.join("|"));
  }
}

const menuText = replaceVariables(cfg.message || "Escolha:", vars);
const listButton = cfg.listButton || "Ver opções";
await sendWhatsAppMenu(inst, phone, "list", menuText, { choices, listButton });
```

Em vez do formato atual que envia `{ sections: apiSections, listButton }`.

Também atualizar o `sendWhatsAppMenu` para passar `choices` diretamente (já funciona via spread, mas garantir clareza).

### Resultado
O menu lista enviará `choices` no formato correto da API e os itens aparecerão corretamente no WhatsApp.

