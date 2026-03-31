

# Exibir videos no chat com suporte a base64/encrypted

## Problema
Videos recebidos no WhatsApp chegam com URLs criptografadas (`.enc`) e nao reproduzem. O componente `MediaVideo` atual tenta usar a URL diretamente sem tratar criptografia nem thumbnails.

## Solucao
Aplicar a mesma logica ja usada em `MediaImage` e `MediaAudio`: mostrar thumbnail base64, download sob demanda ao clicar em play.

## Alteracoes em `src/pages/Conversations.tsx`

### 1. Extrair thumbnail para videos
Na funcao `extractContent`, adicionar `thumbnail: resolveThumbnail()` ao retorno do tipo video (linha 127).

### 2. Reescrever `MediaVideo`
Substituir o componente simples por um com logica de download sob demanda:
- Props: `url`, `caption`, `fromMe`, `thumbnail`, `messageId`
- Se URL criptografada (`.enc`): mostrar thumbnail como preview com icone de Play sobreposto
- Ao clicar no play: chamar `download-media` via Edge Function, cachear resultado em `mediaUrlCache`
- Apos download: renderizar `<video>` com controles normais e URL decriptada
- Se URL normal (nao `.enc`): renderizar `<video controls>` diretamente
- Spinner de loading durante download

### 3. Passar thumbnail e messageId ao MediaVideo
Na renderizacao do case "video" (linha 698-706): passar `thumbnail` e `messageId` (extraido do `msg.id`).

## Resultado
- Videos com URL normal: reproduzem normalmente com `<video controls>`
- Videos com URL `.enc`: mostram thumbnail base64 com botao Play; clique baixa e reproduz
- Mesma UX ja estabelecida para imagens e audios

