

## Autocomplete de variáveis com "/" nos Textareas do Flow Builder

### Problema
Ao editar mensagens nos nós do fluxo, o usuário precisa digitar manualmente `{{variavel}}`. Queremos que ao digitar `/`, apareça um dropdown com todas as variáveis disponíveis para seleção rápida.

### Variáveis disponíveis

**Variáveis do sistema (built-in):**
- `nome`, `telefone`, `cpf`, `email` — dados do cliente
- `veiculo_selecionado`, `veiculo_nome` — do carrossel de veículos
- `localizacao` — captura de localização

**Variáveis dinâmicas:**
- Todas as variáveis definidas nos nós `capture_*` e `set_variable` do fluxo atual (lidas dos nós no canvas)
- Campos personalizados do banco (`customer_field_definitions`)

### Alterações

#### 1. Novo componente: `src/components/flow-builder/VariableTextarea.tsx`
- Wrapper do `<Textarea>` que intercepta a digitação
- Ao detectar `/`, abre um popover/dropdown posicionado no cursor com a lista de variáveis
- Ao selecionar uma variável, insere `{{variavel}}` no texto substituindo o `/`
- Filtra a lista conforme o usuário continua digitando após `/` (ex: `/nom` filtra para `nome`)
- Fecha o dropdown com Escape ou ao clicar fora
- Usa `Popover` + lista estilizada (ou Command do cmdk para busca)

**Fontes de variáveis:**
1. Lista fixa de variáveis do sistema (`nome`, `telefone`, `cpf`, `email`, `veiculo_selecionado`, `veiculo_nome`)
2. Variáveis extraídas dos nós do fluxo atual — percorrer todos os nodes e coletar `config.variable` dos nós `capture_*` e `set_variable`
3. Campos personalizados via `useCustomerFieldDefinitions()`

#### 2. Alterar `src/components/flow-builder/NodeConfigPanel.tsx`
- Substituir todos os `<Textarea>` de mensagem pelo novo `<VariableTextarea>`
- Passar os nós atuais do fluxo como prop para extrair variáveis dinâmicas
- Adicionar prop `nodes` ao `NodeConfigPanelProps`

#### 3. Alterar `src/pages/FlowBuilder.tsx`
- Passar `nodes` como prop para o `NodeConfigPanel`

### Comportamento do dropdown
- Aparece ao digitar `/` em qualquer posição do texto
- Mostra variáveis agrupadas: "Sistema", "Captura", "Campos Personalizados"
- Navegação por setas ↑↓ e Enter para selecionar
- Insere `{{variavel_selecionada}}` no lugar do `/` + texto digitado

