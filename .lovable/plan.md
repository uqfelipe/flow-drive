
## Adicionar edição e remoção de lembretes

### 1. Hook: `src/hooks/use-reminders.ts`
- Adicionar `useUpdateReminder()` — mutation que faz `update` na tabela `reminders` (customer_id, message, scheduled_at) por id
- Adicionar `useDeleteReminder()` — mutation que faz `delete` na tabela `reminders` por id

### 2. Página: `src/pages/Reminders.tsx`
- Adicionar estado `editingReminder` para controlar qual lembrete está sendo editado
- Reutilizar o mesmo dialog de criação para edição: ao abrir para editar, preencher os campos com os dados do lembrete existente
- Alterar título do dialog dinamicamente ("Novo Lembrete" vs "Editar Lembrete")
- Na coluna "Ação" da tabela, para lembretes com status `pending`:
  - Botão de editar (ícone `Pencil`) — abre o dialog preenchido
  - Botão de remover (ícone `Trash2`) — abre AlertDialog de confirmação antes de deletar
- Importar `AlertDialog` para confirmação de exclusão
- Importar ícones `Pencil` e `Trash2` do lucide-react
