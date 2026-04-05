

## Importar fluxo a partir de arquivo JSON

### O que faz
Adiciona um botão de importação na toolbar (ícone Upload) ao lado do botão de exportação. Ao clicar, abre um file picker para selecionar um `.json`. O arquivo é validado e os nós/edges são carregados no canvas, substituindo o conteúdo atual.

### Alteração

#### `src/pages/FlowBuilder.tsx`
- Adicionar import do ícone `Upload` do lucide-react
- Criar função `handleImport`:
  - Cria um `<input type="file" accept=".json">` invisível via JS e dispara o click
  - No `onChange`, lê o arquivo com `FileReader`
  - Faz `JSON.parse` e valida que o objeto tem `nodes` (array) e `edges` (array)
  - Se válido: `setNodes(data.nodes)`, `setEdges(data.edges)`, e opcionalmente atualiza `currentFlowName` se presente no JSON
  - Se inválido: exibe toast de erro
- Adicionar botão `Upload` na toolbar, ao lado do botão de exportar

