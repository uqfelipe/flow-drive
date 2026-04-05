

## Adicionar buscador de nós no canvas do Flow Builder

### O que faz
Um campo de busca flutuante no canvas que permite digitar o nome de um nó e, ao selecionar, faz zoom/pan automático até ele, destacando-o visualmente.

### Alteração

#### `src/pages/FlowBuilder.tsx`
- Adicionar estado `nodeSearch` (string) e `showNodeSearch` (boolean)
- Adicionar botão com ícone `Search` na toolbar (junto aos controles existentes)
- Renderizar um popover/input flutuante no canto superior direito do canvas quando ativo
- Filtrar `nodes` pelo label (`node.data.label`) conforme o usuário digita
- Mostrar lista dropdown com os nós encontrados (ícone + nome)
- Ao clicar em um resultado: usar `reactFlowInstance.setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 600 })` para animar até o nó
- Selecionar o nó encontrado (`setSelectedNode`) para destacá-lo
- Atalho `Ctrl+F` para abrir/fechar o buscador

### UI do buscador
- Caixa flutuante `absolute top-4 right-4` sobre o canvas, `w-72`, com bordas arredondadas e sombra
- Input com ícone de busca + lista de resultados abaixo (max 5 itens visíveis com scroll)
- Cada item mostra ícone colorido do tipo + label do nó
- Botão X para fechar

