

## Adicionar nó "Carrossel de Veículos" na categoria Mídia

### Objetivo
Criar um novo tipo de nó `vehicle_carousel` que busca veículos disponíveis do banco de dados e envia um carrossel interativo via WhatsApp usando o endpoint `/send/carousel` da uazapi.

### Como funciona

O usuário arrasta o nó "Carrossel de Veículos" para o fluxo. Ao ser executado, o webhook busca os veículos com status `available` do banco, monta os cards do carrossel (imagem + nome/modelo/preço + botão "Quero este") e envia via `/send/carousel`. Quando o cliente clica em um botão, a resposta é capturada como variável.

### Alterações

#### 1. `src/components/flow-builder/nodeTypes.ts`
- Importar o ícone `Car` do lucide-react
- Adicionar novo nó na categoria `midia`:
```
{ type: "vehicle_carousel", label: "Carrossel Veículos", category: "midia",
  icon: Car, description: "Exibir veículos disponíveis em carrossel",
  color: "#F59E0B", defaultConfig: { 
    message: "Confira nossos veículos disponíveis:",
    buttonText: "Quero este",
    category: "",
    maxCards: 10
  }
}
```

#### 2. `src/components/flow-builder/NodeConfigPanel.tsx`
- Adicionar bloco de configuração para `vehicle_carousel` com:
  - Textarea para mensagem principal do carrossel
  - Input para texto do botão (padrão: "Quero este")
  - Select para filtrar por categoria de veículo (opcional: todos, sedan, SUV, hatch, etc.)
  - Input numérico para máximo de cards (2-10)

#### 3. `src/components/flow-builder/FlowNode.tsx`
- Adicionar renderização visual para o nó `vehicle_carousel` mostrando um preview com ícone de carro e texto configurado

#### 4. `supabase/functions/whatsapp-webhook/index.ts`
- Adicionar handler para `nt === "vehicle_carousel"`:
  1. Busca veículos com `status = 'available'` do Supabase (filtro por categoria se configurado)
  2. Limita ao `maxCards` configurado
  3. Monta o payload para `/send/carousel`:
```typescript
{
  number: phone,
  text: "Confira nossos veículos disponíveis:",
  carousel: vehicles.map(v => ({
    text: `${v.name} ${v.model}\n${v.brand} ${v.year} - ${v.color}\nDiária: R$ ${v.daily_rate}`,
    image: v.images?.[0] || "",
    buttons: [{ id: `veiculo_${v.id}`, text: "Quero este", type: "REPLY" }]
  }))
}
```
  4. Endpoint: `POST /send/carousel`
  5. Fallback: se falhar, envia mensagens de texto individuais com links das imagens
  6. Salva o veículo selecionado na variável `veiculo_selecionado` quando o usuário responder

### Detalhes técnicos

- **API uazapi**: Endpoint `POST /send/carousel` com payload `{ number, text, carousel: [{ text, image, buttons: [{ id, text, type }] }] }`
- **Mín 2 cards, máx 10** (limitação do WhatsApp)
- Se não houver veículos disponíveis, envia mensagem de texto informando
- A resposta do botão REPLY envia o `id` como mensagem, que será interceptada pelo flow engine para capturar qual veículo foi escolhido

