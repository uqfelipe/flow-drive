

# Fix: Envio e recebimento de mensagens no chat

## Problemas identificados

Analisando as respostas da API uazapi nos network requests, encontrei 3 problemas principais:

### 1. Timestamps em milissegundos tratados como segundos
A API retorna `messageTimestamp` em **milissegundos** (ex: `1774985654288` — 13 digitos). Mas `formatMsgTime` e `formatTime` fazem `new Date(ts * 1000)`, multiplicando por 1000 novamente, resultando em datas absurdas.

### 2. Campo `type` vs `messageType`
O hook espera `msg.type` mas a API retorna `messageType` (ex: `"ExtendedTextMessage"`, `"Conversation"`). O `extractContent` nunca encontra o tipo correto.

### 3. Status capitalizado
A API retorna `"Sent"`, `"Delivered"`, `"Read"` mas o código compara com lowercase `"read"`, `"delivered"`. Os checks duplos (✓✓ azuis) nunca aparecem.

## Alterações

### `src/hooks/use-chat.ts`
- Na query `useChatMessages`, mapear os campos da API para a interface correta:
  - `messageTimestamp` → `timestamp` (converter ms para segundos: `/ 1000`)
  - `messageType` → `type`
  - `status` → lowercase
  - Usar `msg.text` (top-level) como fallback para conteúdo

### `src/pages/Conversations.tsx`
- `formatTime`: o campo `wa_lastMsgTimestamp` da lista de chats também vem em ms — ajustar para detectar automaticamente (se > 10 digitos, já é ms, não multiplicar por 1000)
- `extractContent`: também checar `(msg as any).text` no top-level como a API retorna

## Detalhes técnicos

Exemplo de resposta real da API:
```text
messageTimestamp: 1774985654288  (milissegundos)
messageType: "ExtendedTextMessage"
status: "Sent"
text: "oooiii"  (campo top-level)
content: { text: "oooiii", contextInfo: {} }
```

A normalização será feita no hook para manter o componente limpo.

