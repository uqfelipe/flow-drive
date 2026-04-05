

## Remover filtro por categoria do Carrossel de Veículos

### Alterações em `src/components/flow-builder/NodeConfigPanel.tsx`

1. **Remover o bloco do Select de categoria** (linhas 781-796) — o dropdown "Filtrar por categoria"
2. **Remover o filtro na query de busca** (linhas 734-737) — remover o `if (cat)` que aplica `.eq("category", cat)`, deixando a query buscar todos os veículos disponíveis sem filtro

