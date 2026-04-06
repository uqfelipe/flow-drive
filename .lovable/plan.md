

## Remover card "Alertas Recentes" do Dashboard

### Alteração

| Arquivo | O que |
|---------|-------|
| `src/pages/Dashboard.tsx` | Remover o card de "Alertas Recentes" do grid inferior e ajustar o grid de 3 para 2 colunas (`lg:grid-cols-2`) |

O card de alertas (linhas ~107-125) será removido, mantendo apenas "Locações Recentes" e "Bloco de Notas". As importações não utilizadas (`AlertTriangle` do card, `useNotifications`, `alertTypeMap`) também serão limpas.

