

# Plano: Página de Veículos com CRUD completo

## O que será feito

Transformar a página `/vehicles` de somente leitura para CRUD completo com:
- Dialog para **criar novo veículo** (formulário com todos os campos)
- Dialog para **editar veículo** (clicando no card)
- Botão de **excluir veículo** com confirmação
- Filtro por status funcional
- Feedback com toasts de sucesso/erro

## Arquivos modificados

### 1. `src/components/VehicleFormDialog.tsx` (novo)
- Componente Dialog reutilizável para criar e editar veículos
- Campos: nome, marca, modelo, ano, placa, cor, categoria (select), status (select), diária, semanal, mensal, descrição
- Validação básica dos campos obrigatórios
- Usa `useCreateVehicle` ou `useUpdateVehicle` conforme o modo
- Toast de sucesso/erro

### 2. `src/components/VehicleDeleteDialog.tsx` (novo)
- AlertDialog de confirmação antes de excluir
- Usa `useDeleteVehicle`
- Toast de sucesso/erro

### 3. `src/pages/Vehicles.tsx` (modificado)
- Estado para controlar abertura do dialog de criar/editar e qual veículo está selecionado
- Botão "Novo Veículo" abre o dialog em modo criação
- Clique no card abre o dialog em modo edição
- Botão de filtro por status com dropdown funcional
- Botão de excluir no card com confirmação
- Empty state quando não há veículos

## Campos do formulário

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| name | Input text | Sim |
| brand | Input text | Sim |
| model | Input text | Sim |
| year | Input number | Sim |
| plate | Input text | Sim |
| color | Input text | Não |
| category | Select (sedan, suv, hatch, pickup, van, luxury, economy) | Sim |
| status | Select (available, reserved, rented, maintenance, inactive) | Sim |
| daily_rate | Input number | Sim |
| weekly_rate | Input number | Sim |
| monthly_rate | Input number | Sim |
| description | Textarea | Não |

## Sem alterações no banco
Os hooks CRUD já existem em `use-vehicles.ts`. A tabela `vehicles` já tem todas as colunas necessárias.

