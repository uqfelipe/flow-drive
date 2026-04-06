

## Adicionar Bloco de Notas ao Dashboard

### O que será feito
Um bloco de notas elegante no Dashboard principal, com campo de busca, possibilidade de criar, editar e excluir anotações. As notas serão salvas no `localStorage` (funciona offline, sem precisar criar tabela no banco).

### Layout
O bloco será adicionado abaixo dos cards de estatísticas e ao lado dos alertas/locações, ocupando toda a largura em uma nova seção.

```text
┌─────────────────────────────────────────────┐
│  🔍 Buscar anotações...     [+ Nova Nota]   │
├─────────────────────────────────────────────┤
│  📝 Título da nota 1           12/04/2026   │
│     Prévia do conteúdo...                   │
│  📝 Título da nota 2           11/04/2026   │
│     Prévia do conteúdo...                   │
│  ...                                        │
└─────────────────────────────────────────────┘
```

Ao clicar numa nota, abre um dialog para editar. Inclui botão de excluir.

### Alterações

| Arquivo | O que |
|---------|-------|
| `src/hooks/use-notes.ts` | Novo hook com CRUD de notas via localStorage + estado React |
| `src/components/NotesBlock.tsx` | Componente do bloco de notas com busca, lista, criação e edição |
| `src/pages/Dashboard.tsx` | Importar e renderizar o `NotesBlock` após os cards existentes |

### Detalhes do componente
- **Busca**: filtra por título e conteúdo em tempo real
- **Criação**: dialog com título + textarea para conteúdo
- **Edição**: clique na nota abre o mesmo dialog preenchido
- **Exclusão**: botão dentro do dialog de edição com confirmação
- **Visual**: card com gradiente sutil, ícone de bloco de notas, ScrollArea para lista, badges com data, cores consistentes com o tema dark do projeto
- **Persistência**: `localStorage` key `app-notes`, serializado como JSON

