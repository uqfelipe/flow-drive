

## Corrigir imagem no Menu Botões + remover limite de 3 botões

### Problemas
1. **Imagem não chega ao usuário**: O campo `imageButton` é passado como `{ image: cfg.imageButton }` no `sendWhatsAppMenu`, mas a API uazapi espera `mediaUrl` para imagens em menus de botão interativo.
2. **Limite de 3 botões**: O painel de configuração limita a 3 botões. O usuário quer adicionar o máximo possível.

### Alterações

**1. `src/components/flow-builder/NodeConfigPanel.tsx`**
- Remover `canAdd` e o limite `buttons.length < 3` (linha 113)
- Remover o indicador `{buttons.length}/3` (linha 126)
- Remover `disabled={!canAdd}` do botão de adicionar (linha 140)

**2. `supabase/functions/whatsapp-webhook/index.ts`** — linha 515
- Alterar `{ image: cfg.imageButton }` para `{ mediaUrl: cfg.imageButton }` para que a API uazapi processe a imagem corretamente no menu de botões

### Detalhes técnicos
- A API uazapi `/send/menu` usa o campo `mediaUrl` para anexar mídia a menus interativos, não `image`
- O limite de 3 botões era do WhatsApp para botões interativos (type button), mas o usuário quer liberdade total — se a API recusar, o fallback de texto já existe

