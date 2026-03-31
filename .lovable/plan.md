

# Plano: Chat em tempo real com clientes via WhatsApp API

## O que será feito

Transformar a página `/conversations` em uma interface de chat completa estilo WhatsApp, permitindo visualizar histórico de mensagens e enviar mensagens de texto para clientes usando a API uazapi.

## Arquitetura

```text
Frontend (Conversations.tsx)
  ├── Lista de conversas (painel esquerdo)
  └── Painel de chat (painel direito)
        ├── Histórico de mensagens ← Edge Function → uazapi POST /message/find
        └── Enviar mensagem       ← Edge Function → uazapi POST /send/text
```

A comunicação com a uazapi passa por uma Edge Function intermediária (`whatsapp-chat`) que lê `server_url` e `instance_token` da tabela `whatsapp_instances` no Supabase, evitando expor tokens no frontend.

## Alterações

### 1. Edge Function `supabase/functions/whatsapp-chat/index.ts` (novo)

Ações suportadas:
- **`fetch-messages`**: recebe `{ phone }`, converte para chatid (`phone@s.whatsapp.net`), chama `POST {server_url}/message/find` com `{ chatid, limit: 50 }` e retorna as mensagens
- **`send-text`**: recebe `{ phone, text }`, chama `POST {server_url}/send/text` com `{ number: phone, text }` e retorna o resultado
- **`list-chats`**: chama `POST {server_url}/chat/find` com `{ limit: 50 }` para listar conversas recentes direto da API do WhatsApp

Usa `whatsapp_instances` para obter `server_url` e `instance_token`.

### 2. Hook `src/hooks/use-chat.ts` (novo)

- `useChatMessages(phone)`: React Query que chama a edge function `fetch-messages`, refetch a cada 5s para polling
- `useSendMessage()`: mutation que chama `send-text` e invalida a query de mensagens
- `useWhatsAppChats()`: React Query que chama `list-chats` para listar conversas da instância

### 3. Página `src/pages/Conversations.tsx` (reescrita)

Layout split-panel:
- **Painel esquerdo** (~320px): lista de conversas vindas da API do WhatsApp (nome, último texto, timestamp), com busca
- **Painel direito**: área de chat com:
  - Header com nome/telefone do contato
  - Área de mensagens com scroll (bolhas verdes = enviadas, brancas = recebidas)
  - Input de texto + botão enviar na parte inferior
  - Mensagens ordenadas cronologicamente, `fromMe` diferencia enviadas/recebidas

### 4. Rota no App.tsx

Nenhuma alteração necessária — `/conversations` já existe.

## Detalhes técnicos

- **API uazapi usada**:
  - `POST /message/find` → busca mensagens por `chatid` (formato `phone@s.whatsapp.net`)
  - `POST /send/text` → envia texto com `{ number, text }`
  - Autenticação via header `token` com `instance_token` da tabela
- **Polling**: mensagens atualizadas a cada 5 segundos via `refetchInterval`
- **CORS**: Edge Function com headers padrão Supabase
- **Sem novas tabelas**: tudo via API direta da uazapi, sem persistir mensagens localmente

