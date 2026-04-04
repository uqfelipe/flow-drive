

## Página dedicada para Campos Personalizados

### O que será feito
Criar uma página completa `/customers/fields` para gerenciar campos personalizados, substituindo o dialog atual. Layout refinado seguindo o padrão visual das páginas de edição de cliente.

### Estrutura da página

**Header**: Título "Campos Personalizados" com subtítulo explicativo sobre `capture_text` e variáveis `{{}}`.

**Layout 2 colunas (lg:grid-cols-3)**:
- **Coluna principal (col-span-2)**: Card com a lista de campos existentes em formato de tabela/cards refinados, mostrando rótulo, variável (`{{key}}`), tipo e botão de excluir. Estado vazio com ícone e texto centralizado.
- **Sidebar (col-span-1)**: Card "Novo Campo" com formulário compacto vertical (Variável, Rótulo, Tipo select, botão Adicionar). Abaixo, um card de "Dica" explicando como usar as variáveis no fluxo.

### Alterações

1. **`src/pages/CustomerFields.tsx`** — Nova página com AdminLayout, usando os hooks existentes (`useCustomerFieldDefinitions`, `useCreateFieldDefinition`, `useDeleteFieldDefinition`). Cards refinados com badges de tipo, código da variável em mono, e confirmação visual ao excluir.

2. **`src/App.tsx`** — Adicionar rota `/customers/fields`.

3. **`src/components/AppSidebar.tsx`** — Adicionar item "Campos" no grupo Principal, abaixo de "Clientes", com ícone `Variable`.

4. **`src/pages/Customers.tsx`** — Remover botão de "Gerenciar Campos" e o dialog `CustomerFieldsManager`, já que agora é uma página separada.

