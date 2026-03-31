

# Plano: Filtros por Status na Página de Reservas

## O que será feito

Adicionar chips/botões de filtro por status da reserva acima da listagem, permitindo filtrar por: Todas, Pendente, Aprovada, Ativa, Concluída, Cancelada.

## Alteração

### `src/pages/Rentals.tsx`

- Adicionar estado `statusFilter` (default: `"all"`)
- Renderizar uma row de botões/toggles com os status disponíveis (usando `Button` variant outline/default)
- Aplicar filtro no array `filtered` combinando busca textual + status selecionado
- Mostrar contador de resultados por status nos botões (badge)

Layout: botões ficam na mesma linha do campo de busca ou logo abaixo, antes da listagem.

