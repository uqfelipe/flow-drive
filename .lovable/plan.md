

## Corrigir auto-preenchimento de campos personalizados

### Problema
O log mostra que a variável é capturada como `{{comida}}` (com chaves), mas a tabela `customer_field_definitions` armazena apenas `comida`. A comparação `eq("field_key", varName)` falha porque `{{comida}} != comida`.

O mesmo problema afeta as NAME_VARS — funciona para `nome` só por sorte de como foi salvo no config do nó, mas pode falhar se o usuário salvar como `{{nome}}`.

### Solução

**Arquivo: `supabase/functions/whatsapp-webhook/index.ts`**

Após extrair o `varName` na linha 169, normalizar removendo `{{` e `}}`:

```typescript
let varName = currentNode.data.config?.variable || nt.replace("capture_", "");
varName = varName.replace(/^\{\{/, "").replace(/\}\}$/, "").trim();
```

Isso garante que:
- `{{comida}}` → `comida` → encontra match em `customer_field_definitions`
- `{{nome}}` → `nome` → encontra match em `NAME_VARS`
- `nome` (sem chaves) → continua funcionando normalmente

### Resultado
Quando o chatbot captura `{{comida}} = "macarrão"`, o valor será salvo em `customers.custom_fields.comida` automaticamente.

