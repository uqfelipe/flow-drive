

# Plano: Mostrar fotos do cliente e do veículo nas reservas

## O que será feito

Exibir a foto do cliente e a imagem do veículo em cada card de reserva, substituindo o ícone genérico atual.

## Alterações

### 1. `src/hooks/use-rentals.ts`

- Atualizar o select para incluir `photo` do customer e `images` do vehicle:
  ```
  .select("*, vehicles(name, brand, model, year, images), customers(name, phone, photo)")
  ```
- Atualizar a interface `RentalRow` para incluir esses campos

### 2. `src/pages/Rentals.tsx`

- Importar `Avatar, AvatarImage, AvatarFallback` de `@/components/ui/avatar`
- Substituir o ícone genérico por dois elementos lado a lado:
  - **Avatar do cliente**: mostra `rental.customers?.photo` ou iniciais do nome como fallback
  - **Imagem do veículo**: mostra `rental.vehicles?.images?.[0]` em um thumbnail arredondado, ou ícone de carro como fallback

