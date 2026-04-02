

## Criar fluxo visual de boas-vindas com captura de nome

A captura de nome já está implementada no webhook (pergunta automática antes do fluxo iniciar). Agora vou criar os **nós visuais** no Flow Builder que representam o fluxo após o nome ser capturado.

### Fluxo a ser criado

```text
[Mensagem de Boas-vindas] → [Menu Principal]
  "Olá, {{nome}}!             ├─ Alugar veículo
   Como posso ajudar?"        ├─ Consultar reserva
                              └─ Falar com atendente
```

### O que será feito

**1. Inserir nós no fluxo ativo via Supabase** (ou criar novo fluxo se não existir)

Nós a criar:
- **Nó 1 — Mensagem**: `"Olá, {{nome}}! 👋 Como posso te ajudar hoje?"` (usa a variável `nome` capturada pelo webhook)
- **Nó 2 — Menu Botões**: 3 opções — "🚗 Alugar veículo", "📋 Consultar reserva", "👤 Falar com atendente"

Edges conectando nó 1 → nó 2.

**2. Atualizar o fluxo no banco de dados** (`chatbot_flows` table)

Inserir os nodes e edges como JSON no fluxo existente (ou criar um novo).

### Como funciona com o webhook

1. Usuário manda "oi" → webhook pergunta o nome (hardcoded)
2. Usuário responde "Marcela" → webhook salva nome, envia "Perfeito, Marcela — em que posso ajudar?"
3. Webhook inicia o fluxo visual → **Nó 1** envia "Olá, Marcela! 👋 Como posso te ajudar hoje?"
4. **Nó 2** mostra menu com botões interativos

### Arquivo alterado
- Nenhum arquivo de código — apenas dados inseridos na tabela `chatbot_flows` via query SQL

