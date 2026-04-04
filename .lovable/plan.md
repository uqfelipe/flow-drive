

## Adicionar tipo "Localização" aos campos personalizados

### Alterações

**1. `src/pages/CustomerFields.tsx`**
- Adicionar `location: "Localização"` no `typeLabels`
- Adicionar cor no `typeBadgeColors`: `location: "bg-rose-500/10 text-rose-400 border-rose-500/20"`
- Adicionar `<SelectItem value="location">Localização</SelectItem>` no dropdown de tipo
- Adicionar `capture_location` na seção "Como usar"

**2. `src/components/CustomerFieldsManager.tsx`**
- Adicionar `<SelectItem value="location">Localização</SelectItem>` no dropdown de tipo

**3. `src/pages/CustomerEdit.tsx`**
- Adicionar tratamento para `field_type === "location"`: renderizar o valor como link clicável para Google Maps (se contiver coordenadas ou endereço)

### Resultado
O usuário poderá criar campos do tipo "Localização" que armazenam coordenadas/endereço enviados pelo cliente via WhatsApp.

