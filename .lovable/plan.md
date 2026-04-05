

## Melhorar visual do dropdown de variáveis

### O que muda

Redesign do dropdown do `VariableTextarea.tsx`:

1. **Header com lupa de busca**: Adicionar um campo de busca fixo no topo do dropdown com ícone `Search` do lucide-react, mostrando o filtro atual e permitindo visualizar o que está sendo buscado.

2. **Ícones por grupo**: Cada grupo ganha um ícone — `Settings` para Sistema, `Target` para Captura, `User` para Campos Personalizados — exibido ao lado do nome do grupo.

3. **Layout dos itens melhorado**:
   - Cada item com padding maior, bordas arredondadas no hover
   - Variável (`{{key}}`) com badge/chip estilizado em vez de `<code>` simples
   - Descrição à direita com cor suave
   - Separador visual entre grupos

4. **Estado vazio**: Quando o filtro não retorna resultados, mostrar mensagem "Nenhuma variável encontrada" centralizada.

5. **Dica no rodapé**: Texto sutil "Digite / para buscar variáveis" como hint no textarea (atualizar o placeholder).

### Arquivo alterado
- `src/components/flow-builder/VariableTextarea.tsx` — redesign completo do dropdown, adição de ícones e search header

