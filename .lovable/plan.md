

## Plano: Adicionar todos os tipos de envio da API WhatsApi ao Flow Builder

Baseado na documentação completa da API, identifiquei **todos os endpoints de envio** disponíveis e vou mapear cada um para nós no construtor de fluxos, incluindo configuração no painel e execução no motor do webhook.

### O que a API suporta (endpoints `/send/*`)

| Endpoint | Descrição | Status no sistema |
|---|---|---|
| `/send/text` | Texto com link preview | Parcial (nó `message` existe, `send_link` sem engine) |
| `/send/media` (image) | Enviar imagem | Nó existe, sem engine |
| `/send/media` (video) | Enviar vídeo | Nó existe, sem engine |
| `/send/media` (audio/ptt) | Enviar áudio/voz | Nó existe, sem engine |
| `/send/media` (document) | Enviar documento | Nó existe, sem engine |
| `/send/media` (sticker) | Enviar figurinha | Nó existe, sem engine |
| `/send/contact` | Cartão de contato (vCard) | Nó existe, sem engine |
| `/send/location` | Enviar localização | Nó existe, sem engine |
| `/send/location-button` | Solicitar localização | **Novo** |
| `/send/menu` type=button | Botões interativos (REPLY, URL, COPY, CALL) | Parcial (`menu_buttons` existe, sem tipos de botão) |
| `/send/menu` type=list | Menu lista com seções | **Novo** |
| `/send/menu` type=poll | Enquete | Nó existe, sem engine |
| `/send/menu` type=carousel | Carrossel via menu | Nó existe, sem engine |
| `/send/carousel` | Carrossel alternativo com cards+botões | Mesmo nó `menu_carousel` |
| `/send/request-payment` | Solicitar pagamento Pix/boleto | **Novo** |
| `/message/presence` | Indicador "digitando..." | **Novo** (útil como nó de lógica) |

### Passos

#### 1. Adicionar novos nós ao `nodeTypes.ts`
- **`menu_list`** (categoria menu) — Menu lista com seções e itens, usa `/send/menu` type=list
- **`request_location`** (categoria menu) — Botão para solicitar localização do usuário
- **`request_payment`** (categoria integracao) — Solicitar pagamento Pix/boleto/link
- **`typing_indicator`** (categoria logica) — Enviar "digitando..." antes de responder

Também atualizar `defaultConfig` dos nós existentes para suportar os campos da API:
- `menu_buttons`: adicionar campo `buttonType` (REPLY/URL/COPY/CALL) e `imageButton`
- `menu_carousel`: adicionar estrutura de cards com `text`, `image`, `buttons[]` com tipos
- `poll`: adicionar `selectableCount`
- `send_image/video/audio/file/sticker`: adicionar campos `file` (URL), `caption`
- `send_location`: adicionar `latitude`, `longitude`, `address`, `name`
- `contact_card`: adicionar `fullName`, `phoneNumber`, `organization`, `email`
- `send_link`: adicionar `linkPreviewTitle`, `linkPreviewDescription`, `linkPreviewImage`
- `pix`: reformular para usar `/send/request-payment` com campos `pixKey`, `pixType`, `amount`
- `copy_paste`: adicionar campo `text` para copiar

#### 2. Atualizar `FlowNodeCategory` em `types/index.ts`
- Sem mudanças necessárias — os novos nós se encaixam nas categorias existentes

#### 3. Atualizar `NodeConfigPanel.tsx`
Adicionar painéis de configuração para cada novo/atualizado nó:
- **menu_list**: Editor de seções `[Título]` + itens `texto|id|descrição`, campo `listButton`
- **menu_buttons**: Selector de tipo de botão (REPLY/URL/COPY/CALL), campo `imageButton`
- **menu_carousel**: Editor de cards (texto, URL imagem, array de botões com tipo)
- **poll**: Campo `selectableCount`, editor de opções
- **send_image/video/audio/file/sticker**: Campo URL do arquivo + caption
- **send_location**: Campos latitude, longitude, nome, endereço
- **contact_card**: Campos nome, telefone, organização, email, URL
- **request_location**: Campo de texto da mensagem
- **request_payment**: Campos amount, pixKey, pixType, paymentLink, boletoCode, etc.
- **typing_indicator**: Campo de duração em segundos
- **send_link**: Campos URL, título, descrição, imagem do preview

#### 4. Atualizar o motor do webhook (`whatsapp-webhook/index.ts`)
Adicionar helpers de envio para cada endpoint da API:
- `sendWhatsAppMedia(inst, phone, type, file, caption?)` → `/send/media`
- `sendWhatsAppContact(inst, phone, fullName, phoneNumber, org?, email?)` → `/send/contact`
- `sendWhatsAppLocation(inst, phone, lat, lng, name?, address?)` → `/send/location`
- `sendWhatsAppLocationButton(inst, phone, text)` → `/send/location-button`
- `sendWhatsAppMenu(inst, phone, type, text, choices, opts?)` → `/send/menu`
- `sendWhatsAppCarousel(inst, phone, text, cards)` → `/send/carousel`
- `sendWhatsAppPayment(inst, phone, amount, opts)` → `/send/request-payment`
- `sendWhatsAppPresence(inst, phone, presence, delay?)` → `/message/presence`

Expandir `SUPPORTED_NODE_TYPES` e o `processFlow` switch para processar todos esses nós.

#### 5. Deploy das Edge Functions
- Redeployar `whatsapp-webhook` com os novos handlers

### Arquivos alterados
- `src/components/flow-builder/nodeTypes.ts` — 4 novos nós + configs atualizadas
- `src/components/flow-builder/NodeConfigPanel.tsx` — Painéis para todos os novos tipos
- `supabase/functions/whatsapp-webhook/index.ts` — Helpers de envio + engine expandido
- `src/types/index.ts` — Nenhuma mudança necessária

### Resultado
Todos os tipos de envio suportados pela API WhatsApi estarão disponíveis como nós no construtor de fluxos, com painel de configuração e execução automática pelo motor do webhook.

