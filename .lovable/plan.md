

## Corrigir recebimento da resposta do carrossel no webhook

### Problema raiz
Quando o usuário seleciona um veículo no carrossel do WhatsApp, a mensagem chega com `msg.text = ""` (string vazia). O campo `text` vazio impede que o fallback `??` alcance `content.selectedDisplayText` (porque `??` só faz fallback para `null`/`undefined`, não para `""`). Resultado: `text = ""`, a mensagem é filtrada na linha 1143 (`!text && !mediaUrl...`) e nunca chega ao motor de fluxo.

Os logs confirmam:
- `content_keys=selectedID,selectedDisplayText,contextInfo,selectedIndex,selectedCarouselCardIndex`
- `text=""` → `valid=0` → FILTERED

### Alteração

#### `supabase/functions/whatsapp-webhook/index.ts`

**1. Corrigir extração do texto (linhas 912-920)**

Na cadeia de extração de `text`, adicionar fallback para `content.selectedID` e `msg.buttonOrListid` (que contém o ID do botão selecionado no carrossel, ex: `veiculo_<uuid>`). Trocar `??` por `||` para que strings vazias caiam no próximo fallback:

```typescript
const text = (
  msg.body ||
  msg.text ||
  msg.conversation ||
  msg.message?.conversation ||
  msg.message?.extendedTextMessage?.text ||
  (typeof msg.content === "object" && msg.content !== null
    ? (msg.content.selectedID || msg.content.selectedDisplayText)
    : undefined) ||
  msg.buttonOrListid ||
  ""
).toString().trim();
```

Isso garante que quando `msg.text` é `""`, a cadeia continua e pega `content.selectedID` (ex: `veiculo_abc123`) que é exatamente o que o handler do carrossel espera no `text.match(/^veiculo_(.+)$/i)`.

### Resultado
1. Mensagem do carrossel chega com `text = "veiculo_<uuid>"` em vez de `""`
2. Passa pelo filtro de validação (text não é vazio)
3. Chega ao handler `vehicle_carousel` (linha 1373)
4. Faz match com `veiculo_<id>`, encontra o índice no `config.vehicles`, usa handle `vehicle-0`, `vehicle-1`, etc.
5. Segue para o nó de mensagem conectado àquela saída

