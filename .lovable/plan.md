

## Remover categoria "Integrações" do Flow Builder

### Alterações

**1. `src/components/flow-builder/nodeTypes.ts`**
- Remover a linha `{ category: "integracao", label: "Integrações", icon: Puzzle }` do array `nodeCategories`
- Remover todos os 5 nós da categoria `integracao` (webhook, transfer_human, end, integration, request_payment) do array `nodeTypes`
- Remover o import de `Puzzle`, `Webhook`, `HeadphonesIcon`, `XCircle`, `DollarSign` se não usados em outro lugar

**2. `src/types/index.ts`**
- Remover `'integracao'` do tipo `FlowNodeCategory`

