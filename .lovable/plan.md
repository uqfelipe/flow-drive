

## Corrigir componente "Enviar Localização" (send_location)

### Problemas identificados

1. **Webhook — falha silenciosa**: Os logs mostram que o nó `send_location` é processado mas NENHUM envio acontece. O `parseFloat("")` retorna `NaN`, o `if (!isNaN(lat) && !isNaN(lng))` falha silenciosamente, e nenhuma mensagem é enviada nem logada.

2. **Frontend — UX fraca**: O painel de configuração tem apenas campos de texto cru para latitude/longitude. O usuário precisa saber as coordenadas exatas, o que é impraticável. Não há feedback se os campos estão vazios ou inválidos.

3. **Endpoint possivelmente inexistente**: Assim como `/send/sticker` não existia na uazapi, `/send/location` pode não existir. A documentação da API não é acessível para confirmar, mas o padrão é o mesmo.

### Correção

#### 1. Webhook — adicionar log e fallback de texto

**`supabase/functions/whatsapp-webhook/index.ts`**:

- Adicionar log de warning quando lat/lng são inválidos
- Tentar primeiro `/send/location`; se falhar com 404/405, enviar como texto formatado com link do Google Maps como fallback
- Aplicar `replaceVariables` nos campos name e address

```typescript
if (nt === "send_location") {
  const lat = parseFloat(cfg.latitude);
  const lng = parseFloat(cfg.longitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    const locName = replaceVariables(cfg.name || "", vars);
    const locAddr = replaceVariables(cfg.address || "", vars);
    try {
      await sendWhatsAppLocation(inst, phone, lat, lng, locName, locAddr);
    } catch (e) {
      console.error(`[FLOW] /send/location failed, sending text fallback`, e.message);
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      const fallback = locName ? `📍 ${locName}\n${locAddr || ""}\n${mapsUrl}` : `📍 ${mapsUrl}`;
      try { await sendWhatsAppText(inst, phone, fallback.trim()); } catch (_) {}
    }
  } else {
    console.warn(`[FLOW] send_location skipped: invalid lat="${cfg.latitude}" lng="${cfg.longitude}"`);
  }
  nodeId = findNextNodeId(flowEdges, nodeId);
  continue;
}
```

Re-deploy da edge function `whatsapp-webhook`.

#### 2. Frontend — melhorar painel de configuração

**`src/components/flow-builder/NodeConfigPanel.tsx`**:

- Adicionar validação visual (borda vermelha) quando latitude/longitude estão vazios ou inválidos
- Adicionar preview com link do Google Maps quando coordenadas válidas
- Adicionar dica de preenchimento ("Ex: -23.5505")
- Adicionar uma mensagem auxiliar explicando como obter coordenadas (Google Maps → botão direito → copiar coordenadas)

### Detalhes técnicos

O bloco `send_location` no `NodeConfigPanel.tsx` (linhas 507-528) será expandido para incluir:
- Validação inline de formato numérico nos campos lat/lng
- Preview com miniatura de mapa (link Google Maps Static ou apenas link clicável)
- Texto auxiliar para o usuário

