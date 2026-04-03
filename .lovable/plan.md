

## Corrigir o fluxo: usar Menu Lista (seleção) em vez de Menu Botões

### Problema
O fluxo atual usa `menu_buttons`, que na API WhatsApp envia botões de resposta rápida (máximo 3, limitados). O usuário quer um **menu de seleção** (menu_list) — aquele que aparece como um botão "Ver opções" e abre uma lista para selecionar.

### O que será feito

**1. Atualizar os dados do fluxo no banco** (`chatbot_flows` table)

Trocar o nó `node_menu` de `menu_buttons` para `menu_list`, com a estrutura correta de `sections` e `items`:

```json
{
  "id": "node_menu",
  "type": "flowNode",
  "data": {
    "label": "Menu Principal",
    "category": "menu",
    "nodeType": "menu_list",
    "config": {
      "message": "Olá, {{nome}}! Qual carro você deseja alugar?",
      "listButton": "Ver opções",
      "sections": [
        {
          "title": "Veículos disponíveis",
          "items": [
            { "title": "Sedan", "description": "Carros sedan confortáveis" },
            { "title": "SUV", "description": "SUVs espaçosos" },
            { "title": "Hatch", "description": "Carros compactos" },
            { "title": "Pickup", "description": "Pickups robustas" }
          ]
        }
      ]
    }
  }
}
```

**2. Simplificar o fluxo para 2 nós**:
- **Nó 1 (mensagem)**: Saudação com `{{nome}}`
- **Nó 2 (menu_list)**: Menu de seleção perguntando qual carro deseja alugar, com categorias de veículos como opções

**3. Verificar o webhook** — o handler de `menu_list` já está implementado (linhas 347-361 e 520-537), usando a API `/send/menu` com `type: "list"`. Nenhuma mudança no código é necessária.

### Resultado esperado
Ao invés de texto numerado ou botões, o usuário verá um botão "Ver opções" que abre uma lista interativa do WhatsApp para selecionar o tipo de veículo.

### Arquivos alterados
- Nenhum arquivo de código — apenas UPDATE na tabela `chatbot_flows` via SQL

