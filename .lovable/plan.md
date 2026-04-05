

## Adicionar nó "Recomeçar com Digitando" ao Flow Builder

### O que é
Um novo tipo de nó no flow builder chamado **"Reinício com Digitando"** (ou "Boas-vindas de Retorno"). Quando a sessão expira por inatividade (30 min), em vez de ir direto pro primeiro nó do fluxo, o sistema:

1. Envia o indicador "digitando..." por X segundos
2. Depois redireciona para o nó que o usuário conectou como saída desse nó

### Alterações

#### 1. Novo tipo de nó (`src/components/flow-builder/nodeTypes.ts`)
Adicionar na categoria "lógica" um novo nó:
- **type**: `restart_with_typing`
- **label**: "Reinício Digitando"
- **icon**: `RotateCcw` (do lucide)
- **description**: "Digitando + redirecionamento ao retornar"
- **defaultConfig**: `{ seconds: 3 }`

#### 2. Painel de configuração (`src/components/flow-builder/NodeConfigPanel.tsx`)
Adicionar case para `restart_with_typing` com campo de tempo em segundos (slider ou input numérico).

#### 3. Preview no nó (`src/components/flow-builder/FlowNode.tsx`)
Mostrar preview do tempo configurado (ex: "Digitando 3s → próximo nó").

#### 4. Webhook — lógica de timeout (`supabase/functions/whatsapp-webhook/index.ts`)
Alterar o trecho de expiração de sessão (linhas 1330-1342):
- Após detectar que a sessão expirou, buscar no fluxo ativo se existe um nó do tipo `restart_with_typing`
- Se existir: enviar presença "composing" pelo tempo configurado, depois iniciar nova sessão a partir do nó conectado à saída do `restart_with_typing`
- Se não existir: comportamento atual (reinicia do primeiro nó)

#### 5. Webhook — processFlow
Adicionar handler para `restart_with_typing` no `processFlow` (junto aos outros nós), igual ao `typing_indicator`: envia presença composing, aguarda, e segue pro próximo nó.

### Fluxo resultante
```text
Usuário volta após 2h
  → Webhook detecta sessão expirada
  → Procura nó "restart_with_typing" no fluxo
  → Envia "digitando..." por 3s
  → Segue para o nó conectado (ex: mensagem de boas-vindas de retorno)
```

