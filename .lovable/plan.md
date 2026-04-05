

## Renomear "Limpar Canvas" para "Formatar" e garantir reset completo

### Problema
O botão atual diz "Limpar canvas" mas o usuário quer o texto "Formatar". Além disso, algo ainda aparece após limpar — provavelmente o buscador de nós ou algum estado residual.

### Alteração: `src/pages/FlowBuilder.tsx`

1. **Renomear o botão**: Mudar `title` de "Limpar canvas" para "Formatar"
2. **Na função `handleClearCanvas`** (renomear para `handleFormat`):
   - Além do que já faz, também fechar o buscador: `setShowNodeSearch(false)`, `setNodeSearch("")`
   - Mudar mensagem do confirm para "Tem certeza que deseja formatar? Todos os nós e conexões serão removidos."
   - Toast: "Canvas formatado"
3. **Trocar ícone** de `Trash2` para `RotateCcw` (ou manter `Trash2` — semanticamente é reset/formatar)
4. **Substituir `Trash2` por `RotateCcw`** no import se desejado (ícone de "reset" faz mais sentido para "Formatar")

