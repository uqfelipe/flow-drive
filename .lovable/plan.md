

## Problema

Quando a sessão está em `waiting` no nó `menu_list` (node 119), e o usuário envia texto que não corresponde a nenhum item do menu (ex: "Oi"), o webhook retorna "❌ Opção inválida" sem reenviar o menu. O usuário fica preso sem saber quais opções escolher.

Além disso, o nó de mensagem (118) tem `message: ""` — não envia nada. Então o fluxo começa "mudo" e depois fica esperando seleção de menu.

## Solução

Quando `handleMenuSelection` retorna `null` (opção inválida), em vez de apenas enviar a mensagem de erro, **reenviar o menu** junto com a mensagem de erro. Assim o usuário vê as opções novamente.

### Mudança no código

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts` (linhas 808-816)

De:
```typescript
if (nt === "menu_text" || nt === "menu_buttons" || nt === "menu_list" || nt === "menu_carousel" || nt === "request_location") {
  const { nextNodeId, selectedOption } = handleMenuSelection(currentNode, text, flowEdges);
  if (nextNodeId) {
    variables["menu_selection"] = selectedOption || text;
    await processFlow(inst, phone, text, session.id, flowNodes, flowEdges, nextNodeId, variables);
  } else {
    try { await sendWhatsAppText(inst, phone, "❌ Opção inválida. Por favor, escolha uma opção válida."); } catch (_) {}
  }
  return;
}
```

Para:
```typescript
if (nt === "menu_text" || nt === "menu_buttons" || nt === "menu_list" || nt === "menu_carousel" || nt === "request_location") {
  const { nextNodeId, selectedOption } = handleMenuSelection(currentNode, text, flowEdges);
  if (nextNodeId) {
    variables["menu_selection"] = selectedOption || text;
    await processFlow(inst, phone, text, session.id, flowNodes, flowEdges, nextNodeId, variables);
  } else {
    // Send error + re-send the menu so user can choose again
    try { await sendWhatsAppText(inst, phone, "❌ Opção inválida. Por favor, escolha uma opção válida."); } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
    // Re-process the current node to resend the menu
    await processFlow(inst, phone, "", session.id, flowNodes, flowEdges, currentNodeId, variables);
  }
  return;
}
```

Porém isso faria o `processFlow` reenviar o menu e entrar em `waiting` novamente — que é exatamente o comportamento desejado. O usuário vê o erro + o menu novamente.

### Resultado
- Quando o usuário digita algo que não é uma opção válida do menu, ele recebe a mensagem de erro **seguida pelo menu reenviado**
- A sessão continua em `waiting` no mesmo nó, permitindo nova tentativa

### Arquivo alterado
- `supabase/functions/whatsapp-webhook/index.ts` — Reenviar menu após opção inválida

