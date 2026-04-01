

## Problema
O nome exibido na lista de conversas vem direto da API do WhatsApp (`wa_contactName` / `wa_name`). Não há consulta à tabela `customers` do banco para sobrepor com um nome cadastrado pelo usuário.

## Solução
Cruzar os chats com a tabela `customers` por telefone. Se o contato existir no banco com nome cadastrado, usar esse nome em vez do que vem do WhatsApp.

## Passos

1. **`src/pages/Conversations.tsx`** — Importar `useCustomers` e criar um mapa `phone → customer.name`
2. **Alterar `chatName()`** — Receber o mapa como segundo parâmetro. Antes de usar `wa_contactName`, verificar se existe um nome no mapa de customers para aquele telefone. Se sim, priorizar o nome do banco.
3. **Aplicar nos pontos de uso** — Passar o mapa em todos os locais onde `chatName()` é chamado (lista de chats, header do chat aberto, etc.)

## Detalhes técnicos
```text
chatName(chat, customerMap) {
  const phone = chat.wa_chatid?.replace(/@.*$/, "");
  if (customerMap[phone]) return customerMap[phone];
  return chat.wa_contactName || wa_name || ...
}
```
- Usa o hook `useCustomers()` já existente em `use-customers.ts`
- Zero alterações no banco de dados

