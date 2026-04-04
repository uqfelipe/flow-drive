

## Corrigir imagem no Menu Botões — enviar imagem separada antes dos botões

### Diagnóstico

Os logs mostram `[SEND] OK /send/menu` — a API aceitou o payload, mas o WhatsApp não exibiu a imagem junto com os botões. Isso indica que o endpoint `/send/menu` da uazapi para `type: "button"` **não suporta o campo `image`** no payload (ele é simplesmente ignorado).

### Solução

Enviar a imagem **antes** dos botões como uma mensagem de mídia separada (`/send/media`), e logo em seguida enviar o menu de botões. O cliente receberá a imagem seguida dos botões — visualmente fica como uma sequência natural.

### Alteração

**`supabase/functions/whatsapp-webhook/index.ts`** — no bloco `menu_buttons` (linhas ~510-530):

1. Se `cfg.imageButton` tiver valor, enviar primeiro via `sendWhatsAppMedia(inst, phone, "image", imgUrl, menuText)` com o texto do menu como legenda
2. Em seguida, enviar `sendWhatsAppMenu` **sem** a imagem e **sem** o texto (já foi na legenda da imagem), ou com texto reduzido tipo "Escolha uma opção:"
3. Se não houver imagem, manter o comportamento atual (enviar menu com texto normalmente)

```text
Fluxo com imagem:
  1. /send/media  → imagem + legenda (texto do menu)
  2. /send/menu   → botões sem texto longo

Fluxo sem imagem:
  1. /send/menu   → botões com texto (como hoje)
```

Redeploy da edge function após a alteração.

