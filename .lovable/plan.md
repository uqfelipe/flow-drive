

## Salvar nome do cliente ao capturar `nome_contato` ou `nome_usuario` no fluxo

### Objetivo
Quando um nó `capture_text` captura um valor na variável `nome_contato` ou `nome_usuario`, o webhook deve automaticamente atualizar o nome do cliente na tabela `customers`.

### Problema atual
A função `processFlow` captura o texto na variável configurada (linha 165-166), mas nunca persiste esse valor na tabela `customers`. O nome fica apenas nas variáveis da sessão.

### Solução

**Arquivo: `supabase/functions/whatsapp-webhook/index.ts`**

1. Adicionar `customerId` como parâmetro da função `processFlow` (atualmente recebe apenas `sessionId`)
2. Após a captura de variável (linha 166-167), verificar se `varName` é `nome_contato`, `nome_usuario`, `nome`, ou `name` — se sim, atualizar `customers.name` com o valor capturado:
   ```
   if (["nome_contato", "nome_usuario", "nome", "name"].includes(varName)) {
     await adminClient.from("customers")
       .update({ name: incomingText })
       .eq("id", customerId);
   }
   ```
3. Atualizar todas as chamadas de `processFlow` para passar o `customerId`

### Resultado
- Nó `capture_text` com variável `{{nome_contato}}` → salva como nome do cliente
- Nó `capture_text` com variável `{{nome_usuario}}` → salva como nome do cliente
- O nome aparece automaticamente na lista de Contatos/Clientes

