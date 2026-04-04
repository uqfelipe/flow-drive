

## Corrigir: Mensagem de boas-vindas antes da verificação do fluxo

### Problema identificado
Nos logs do webhook, vemos que ao receber "oi" do número `553399653956`:
1. O fetch do fluxo ativo retornou um **502 Bad Gateway** (erro temporário do Supabase)
2. O código logou `[AUTO-REPLY] No active flow found` e **retornou antes** de chegar na lógica de boas-vindas (linha 873)

A lógica de welcome está posicionada **depois** da verificação do fluxo — se o fluxo falha ou não existe, a welcome nunca é enviada.

### Solução
Reorganizar o código em `supabase/functions/whatsapp-webhook/index.ts` na função `processIncomingMessage`:

1. **Mover a lógica de welcome para ANTES da verificação do fluxo** — buscar o customer, verificar `welcomed`, enviar a mensagem de boas-vindas, e marcar como `welcomed = true`
2. **Só depois** buscar o fluxo ativo e continuar o processamento normal
3. A welcome precisa apenas do WhatsApp instance e do customer — não depende do fluxo

### Ordem atual (quebrada)
```text
1. Fetch flow          ← falha = return (welcome nunca roda)
2. Get WhatsApp instance
3. Get/create customer
4. Send welcome        ← nunca chega aqui
5. Process flow
```

### Ordem corrigida
```text
1. Get WhatsApp instance
2. Get/create customer
3. Send welcome (if !welcomed)  ← roda independente do fluxo
4. Fetch flow
5. Process flow (se existir)
```

### Arquivo alterado
- `supabase/functions/whatsapp-webhook/index.ts` — reordenar blocos dentro de `processIncomingMessage`

