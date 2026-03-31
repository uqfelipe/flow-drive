

# Suporte a videos base64 inline no chat

## Alteracoes em `src/pages/Conversations.tsx`

### 1. `extractContent` — detectar base64 video no conteudo
Antes do check de video por `msgType` (linha ~126), adicionar deteccao de strings `data:video/` no conteudo raw (string ou campo do objeto). Se encontrado, retornar tipo `video` com `fileUrl` sendo a propria string base64.

### 2. `MediaVideo` — inicializar `playableUrl` com base64
No estado inicial do `playableUrl` (linha 271-274), adicionar check: se `url` comeca com `data:video/`, usar diretamente como playable (sem precisar download).

### Logica resumida
```
// extractContent: detectar base64
if (typeof content === "string" && content.startsWith("data:video/"))
  → return { type: "video", fileUrl: content, text: "" }

// Tambem checar c?.data ou c?.base64 se for objeto

// MediaVideo init:
if (url.startsWith("data:video/")) → playableUrl = url
```

## Arquivos alterados
| Arquivo | O que muda |
|---------|-----------|
| `src/pages/Conversations.tsx` | 2 pontos: extractContent + MediaVideo init |

