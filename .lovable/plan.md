

# Plano: Formulário de Nova Reserva

## O que será feito

Criar um componente `RentalFormDialog` com formulário completo para criar reservas, incluindo selects de veículo e cliente, date pickers para datas, campo de valor e status.

## Componentes

### 1. `src/components/RentalFormDialog.tsx` (novo)

Dialog com formulário contendo:
- **Cliente**: Select buscando da lista de clientes ativos (`useCustomers`)
- **Veículo**: Select buscando veículos disponíveis (`useVehicles`)
- **Data de retirada**: Date picker com Calendar + Popover
- **Data de devolução**: Date picker com Calendar + Popover
- **Valor total**: Input numérico (R$)
- **Status da reserva**: Select (pendente, aprovada, ativa)
- **Status do pagamento**: Select (pendente, pago)

Ao selecionar veículo, preencher automaticamente o valor sugerido com base na `daily_rate` × número de dias.

Submit usa `useCreateRental` existente. Toast de sucesso ao criar.

### 2. `src/pages/Rentals.tsx` (editar)

- Adicionar estado `formOpen` para controlar o dialog
- Conectar botão "Nova Reserva" ao `onClick={() => setFormOpen(true)}`
- Renderizar `<RentalFormDialog>` com props `open` e `onOpenChange`

## Detalhes técnicos

- Seguir padrão dos dialogs existentes (`CustomerFormDialog`, `VehicleFormDialog`)
- Usar `date-fns` para cálculo de dias entre datas
- Calendar com `pointer-events-auto` conforme padrão do projeto
- Hooks existentes: `useCreateRental`, `useCustomers`, `useVehicles` — sem alterações necessárias

