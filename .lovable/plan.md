

## Campos personalizados para clientes com auto-preenchimento via fluxo

### Objetivo
Permitir criar campos customizados no cadastro de clientes (ex: `{{email}}`, `{{endereco}}`, `{{cnh}}`). Quando o chatbot capturar texto via `capture_text` com a mesma variável, o valor é salvo automaticamente no cliente.

### Arquitetura

Usar uma coluna JSONB `custom_fields` na tabela `customers` para armazenar pares chave-valor dinâmicos. Uma tabela `customer_field_definitions` guarda os campos definidos pelo admin (nome, label, tipo).

### Alterações

**1. Migração — criar tabela de definições + coluna JSONB**
- Adicionar coluna `custom_fields jsonb DEFAULT '{}'` na tabela `customers`
- Criar tabela `customer_field_definitions`:
  - `id uuid PK`
  - `field_key text UNIQUE` — nome da variável (ex: `email`, `endereco`)
  - `field_label text` — rótulo exibido no formulário (ex: "E-mail", "Endereço")
  - `field_type text DEFAULT 'text'` — tipo do campo (text, email, phone, etc.)
  - `sort_order int DEFAULT 0`
  - `created_at timestamptz`
- RLS aberto (mesmo padrão do projeto)

**2. `src/hooks/use-customer-fields.ts`** — novo hook
- `useCustomerFieldDefinitions()` — lista todas as definições de campos
- `useCreateFieldDefinition()` — cria novo campo
- `useDeleteFieldDefinition()` — remove campo

**3. `src/components/CustomerFormDialog.tsx`** — exibir campos customizados
- Buscar definições com o hook
- Renderizar inputs dinâmicos abaixo dos campos fixos
- No edit, preencher com valores de `customer.custom_fields`
- No submit, incluir `custom_fields` no create/update

**4. `src/pages/Customers.tsx`** — botão "Gerenciar Campos"
- Mini dialog ou seção para adicionar/remover definições de campos
- Input para `field_key` (variável do fluxo, ex: `email`) e `field_label` (rótulo, ex: "E-mail")

**5. `src/hooks/use-customers.ts`** — incluir `custom_fields` no tipo e mutations

**6. `supabase/functions/whatsapp-webhook/index.ts`** — auto-sync
- Após qualquer `capture_text`, verificar se `varName` existe em `customer_field_definitions`
- Se sim, fazer merge no `custom_fields` JSONB do customer:
  ```sql
  UPDATE customers SET custom_fields = custom_fields || '{"email": "valor"}'
  WHERE id = customerId
  ```

### Resultado
- Admin cria campo "E-mail" com variável `{{email}}` na tela de Clientes
- No fluxo, um nó `capture_text` com variável `email` captura o dado
- O valor aparece automaticamente no formulário do cliente

