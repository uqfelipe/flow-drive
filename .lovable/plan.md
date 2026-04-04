

## Corrigir o Construtor de Fluxos — Bot respondendo fora do fluxo

### Problemas identificados

1. **Pergunta de nome hardcoded fora do fluxo**: O webhook tem lógica fixa que SEMPRE pergunta "Como você gostaria de ser chamado(a)?" quando o usuário não tem nome real. Isso acontece FORA do fluxo — não importa o que está no fluxo ativo, essa pergunta sempre aparece.

2. **Fluxo "Atendimento Inicial" com conteúdo de teste**: O fluxo ativo atual tem apenas:
   - Nó 105 (message): envia "erwrwerwerwerwerwe" (texto de teste)
   - Nó 106 (typing_indicator): mostra digitando por 1 segundo
   - Isso significa que após capturar o nome, o bot envia esse texto sem sentido

3. **Sessão fica presa**: Após processar os 2 nós, a sessão fica `active` sem `current_node_id` válido. Na próxima mensagem, cai no "restarting flow" e repete tudo.

### Solução

Remover a lógica hardcoded de captura de nome do webhook e deixar o fluxo controlar 100% da conversa:

1. **`supabase/functions/whatsapp-webhook/index.ts`**:
   - Remover o bloco `__awaiting_name` e a pergunta hardcoded de nome
   - Remover a verificação `hasRealName` que decide se pergunta o nome ou não
   - Ao iniciar nova sessão, SEMPRE começar direto do primeiro nó do fluxo
   - O fluxo deve conter um nó `capture_name` se quiser capturar o nome — não o webhook
   - Manter a detecção de mudança de nome (`detectNameChange`) pois é útil
   - Quando a sessão termina (último nó processado), marcar como `completed` para que a próxima mensagem inicie uma nova sessão

2. **Após o último nó do fluxo**: Garantir que a sessão seja marcada como `completed` quando não há próximo nó, evitando que fique presa em loop.

### Resultado esperado

```text
Usuário manda "oi"
  → Welcome message (se primeiro contato)
  → Inicia o fluxo ativo do primeiro nó
  → Executa EXATAMENTE o que está no fluxo, nada mais
  → Quando o fluxo acaba, sessão = completed
  → Próxima mensagem = nova sessão do fluxo
```

### Arquivo alterado
- `supabase/functions/whatsapp-webhook/index.ts` — simplificar `processIncomingMessage` removendo lógica hardcoded de nome

