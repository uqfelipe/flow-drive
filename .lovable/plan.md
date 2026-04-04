

## Limpar conversas antigas

### Situação
As conversas exibidas na página vêm diretamente da **API WhatsApp** (endpoint `list-chats`), não do banco local. As tabelas `chat_sessions` e `chat_messages` já estão vazias. Porém existem dados de cache acumulados:
- `chat_read_status`: 67 registros
- `message_signals`: 248 registros

### O que será feito

**1. Limpar tabelas de cache no banco** (via insert tool)
- `DELETE FROM chat_read_status` — remove status de leitura antigos
- `DELETE FROM message_signals` — remove sinais de mensagem acumulados

**2. Adicionar filtro no frontend** (`src/hooks/use-chat.ts`)
- Filtrar chats que não têm mensagens recentes (ex: `wa_lastMsgTimestamp` = 0 ou muito antigo)
- Isso evita mostrar conversas "fantasma" que a API retorna mas que não são relevantes

**3. Opcionalmente: adicionar botão "Limpar conversas"** na página de Conversas para o usuário poder limpar o cache manualmente no futuro

### Arquivos alterados
- `src/hooks/use-chat.ts` — filtro de conversas sem atividade recente
- Banco de dados — DELETE nas tabelas de cache

