

# Fix: Exibir respostas da Meta AI (WhatsApp) no chat

## Problema

Mensagens da IA do WhatsApp (Meta AI) chegam com `messageType: "UnknownMessageType"` e `text: ""`. O texto real está codificado em base64 dentro de:
```
content.message.protocolMessage.editedMessage.richResponseMessage.unifiedResponse.data
```

Decodificando o base64, temos JSON como:
```json
{
  "sections": [{
    "view_model": {
      "primitive": {
        "text": "92992125755",
        "__typename": "GenAIMarkdownTextUXPrimitive"
      }
    }
  }]
}
```

Atualmente `extractContent` não consegue extrair nada e mostra `[mídia]`.

## Alteração

### `src/pages/Conversations.tsx` — `extractContent`

Adicionar lógica para detectar e decodificar respostas Meta AI:

1. Verificar se `content.message?.protocolMessage?.editedMessage?.richResponseMessage?.unifiedResponse?.data` existe
2. Decodificar o base64 com `atob()`
3. Parsear o JSON e extrair o texto de `sections[].view_model.primitive.text`
4. Concatenar todos os sections e retornar como mensagem de texto
5. Adicionar um indicador visual (ex: emoji 🤖) para diferenciar respostas de IA

### `src/hooks/use-chat.ts` — normalização

Na normalização de mensagens, quando `messageType === "UnknownMessageType"` e `text` está vazio, tentar extrair o texto do base64 antes de passar para o componente, populando o campo `text` no top-level.

## Detalhes técnicos

- `atob()` disponível nativamente no browser
- Fallback seguro: se decodificação falhar, mostrar `[mensagem não suportada]` em vez de `[mídia]`
- Manter compatibilidade com mensagens normais — a lógica só executa para `UnknownMessageType` com conteúdo de protocolo

