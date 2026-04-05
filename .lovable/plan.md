

## Corrigir toggle Ativo/Inativo do bot

### Problema
O switch "Ativo/Inativo" só muda o estado local. O status só é salvo no banco quando o usuário clica em "Salvar". Além disso, ao criar um novo fluxo, o status não é enviado — então mesmo salvando com o toggle ativo, o fluxo é criado como "draft".

### Solução
Fazer o toggle salvar o status **imediatamente** no banco (sem precisar clicar "Salvar"), e ao ativar, desativar todos os outros fluxos automaticamente.

### Alteração: `src/pages/FlowBuilder.tsx`

1. **Criar `handleToggleActive(checked: boolean)`**:
   - Se não tem `currentFlowId`, exibir toast de erro: "Salve o fluxo primeiro antes de ativá-lo"
   - Se `checked === true`: desativar todos os outros fluxos no banco, depois atualizar o fluxo atual para `status: "active"`
   - Se `checked === false`: atualizar o fluxo atual para `status: "inactive"`
   - Em caso de sucesso: `setIsActive(checked)`, `setCurrentFlowStatus(...)`, toast de sucesso
   - Em caso de erro: toast de erro, não altera o estado local

2. **Trocar o `onCheckedChange`** do Switch de `setIsActive` para `handleToggleActive`

3. **No `createFlow.mutate`** (linha 415): passar o `status` como `"draft"` explicitamente para evitar ambiguidade

### Resultado
- Toggle funciona instantaneamente sem precisar clicar "Salvar"
- Só permite ativar se o fluxo já foi salvo
- Ao ativar, desativa automaticamente os outros fluxos (só 1 ativo por vez)

