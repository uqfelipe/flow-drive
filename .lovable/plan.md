

## Redesign da página de Editar Cliente

### Problemas atuais
- Layout esticado e desalinhado, formulário ocupa muito espaço vertical
- Foto, campos e sidebar sem hierarquia visual clara
- Status isolado numa row de grid com metade vazia
- Seção de observações ocupa muito espaço
- Campos personalizados sem refinamento visual

### Redesign proposto

**1. Header compacto com foto e info principal inline**
- Substituir o card de formulário por um header compacto no topo com foto (menor, 14x14), nome do cliente em destaque, telefone, badge de status e botões de ação (salvar/cancelar) — tudo numa linha
- Botão de upload da foto aparece ao hover sobre a foto

**2. Layout em abas (Tabs) dentro de um único card**
- **Aba "Dados"**: Nome, Telefone, Status e Observações em grid compacto (3 colunas: nome, telefone, status na mesma row; observações abaixo com rows=2)
- **Aba "Campos Personalizados"**: Grid 2 colunas dos campos customizados, sem o texto `{{key}}` visível (mover para tooltip)
- **Aba "Locações"**: Histórico de locações (movido da sidebar)

**3. Sidebar simplificada — apenas metadados**
- Card pequeno com criado em, atualizado em, total de locações
- Ocupa menos espaço (col-span 1 de 4 em vez de 1 de 3)

**4. Grid 4 colunas no desktop**
- Formulário principal: `lg:col-span-3`
- Sidebar de metadados: `lg:col-span-1`

### Alterações

**`src/pages/CustomerEdit.tsx`** — reescrever o JSX de retorno:
- Importar `Tabs, TabsContent, TabsList, TabsTrigger`
- Header compacto com foto + info + ações
- Conteúdo em abas (Dados, Campos Personalizados, Locações)
- Sidebar reduzida com apenas metadados
- Inputs mais compactos, menos padding, melhor alinhamento

**`src/pages/CustomerNew.tsx`** — aplicar o mesmo estilo refinado:
- Header compacto com foto + ações
- Mesma estrutura de abas (sem aba de Locações)
- Formulário compacto e alinhado

