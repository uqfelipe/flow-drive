

## Implementar memória de nome no webhook do WhatsApp

O webhook já tem variáveis de sessão (`variables`) e substituição com `{{variavel}}`. A ideia é adicionar uma camada de "captura de nome" automática antes do fluxo principal, e detecção de "mude meu nome" durante a conversa.

### Mudanças no arquivo `supabase/functions/whatsapp-webhook/index.ts`

**1. Adicionar função de detecção de pedido de mudança de nome** (~linha 87, antes do `replaceVariables`)

```typescript
function detectNameChange(text: string): string | null {
  const patterns = [
    /(?:mude|troque|altere|muda|troca)\s+(?:meu\s+)?nome\s+(?:para|pra)\s+(.+)/i,
    /(?:me\s+chame?\s+de)\s+(.+)/i,
    /(?:pode\s+me\s+chamar\s+de)\s+(.+)/i,
    /(?:prefiro\s+ser\s+chamad[oa]\s+de)\s+(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function isValidName(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 50) return false;
  if (/^\d+$/.test(trimmed)) return false; // só números
  return true;
}
```

**2. Modificar `processIncomingMessage`** (linhas 793-854) — adicionar lógica de nome em 3 pontos:

**A) Após recuperar sessão existente (~linha 795), antes de processar nós:** detectar pedido de mudança de nome em qualquer momento da conversa:

```typescript
if (session) {
  const variables = (session.variables || {}) as Record<string, string>;
  
  // ── Detect name change request ──
  const newName = detectNameChange(text);
  if (newName && isValidName(newName)) {
    variables["nome"] = newName;
    variables["name"] = newName;
    await adminClient.from("chat_sessions").update({ variables, updated_at: new Date().toISOString() }).eq("id", session.id);
    await adminClient.from("customers").update({ name: newName, updated_at: new Date().toISOString() }).eq("id", customerId);
    try { await sendWhatsAppText(inst, phone, `Nome atualizado para ${newName}. Como posso ajudar, ${newName}?`); } catch (_) {}
    return;
  }
  
  // ── Awaiting name capture ──
  if (variables["__awaiting_name"] === "true") {
    if (isValidName(text)) {
      const nome = text.trim();
      variables["nome"] = nome;
      variables["name"] = nome;
      delete variables["__awaiting_name"];
      await adminClient.from("customers").update({ name: nome, updated_at: new Date().toISOString() }).eq("id", customerId);
      try { await sendWhatsAppText(inst, phone, `Perfeito, ${nome} — em que posso ajudar?`); } catch (_) {}
      // Now start the actual flow
      const targetIds = new Set(flowEdges.map(e => e.target));
      const startNode = flowNodes.find(n => !targetIds.has(n.id));
      if (startNode) {
        await adminClient.from("chat_sessions").update({ variables, current_node_id: startNode.id, updated_at: new Date().toISOString() }).eq("id", session.id);
        await new Promise(r => setTimeout(r, 500));
        await processFlow(inst, phone, "", session.id, flowNodes, flowEdges, startNode.id, variables);
      } else {
        await adminClient.from("chat_sessions").update({ variables, status: "completed", updated_at: new Date().toISOString() }).eq("id", session.id);
      }
      return;
    } else {
      try { await sendWhatsAppText(inst, phone, "Desculpe, não entendi o nome — como você prefere ser chamado(a)?"); } catch (_) {}
      return;
    }
  }
  
  // (existing node processing continues here...)
}
```

**B) Na criação de nova sessão (~linha 843):** em vez de ir direto para o fluxo, primeiro perguntar o nome:

```typescript
// Start new session — ask for name first
const { data: newSession, error: sessError } = await adminClient
  .from("chat_sessions")
  .insert({ customer_id: customerId, flow_id: flow.id, current_node_id: null, variables: { __awaiting_name: "true" }, status: "active" })
  .select().single();

if (sessError || !newSession) { console.error("[AUTO-REPLY] Failed to create session:", sessError); return; }

try { await sendWhatsAppText(inst, phone, "Olá! Como você gostaria de ser chamado(a)?"); } catch (_) {}
```

**C) Se o cliente já tem nome no DB** (não é placeholder de telefone), pular a pergunta e usar direto:

```typescript
// Check if customer already has a real name (not phone placeholder)
const { data: customerData } = await adminClient.from("customers").select("name").eq("id", customerId).single();
const hasRealName = customerData?.name && customerData.name !== phone && !/^\d+$/.test(customerData.name);

if (hasRealName) {
  // Skip name question, use existing name
  const vars = { nome: customerData.name, name: customerData.name };
  const { data: newSession } = await adminClient
    .from("chat_sessions")
    .insert({ customer_id: customerId, flow_id: flow.id, current_node_id: startNode.id, variables: vars, status: "active" })
    .select().single();
  if (newSession) {
    try { await sendWhatsAppText(inst, phone, `Olá, ${customerData.name}! Como posso ajudar?`); } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
    await processFlow(inst, phone, text, newSession.id, flowNodes, flowEdges, startNode.id, vars);
  }
} else {
  // Ask for name
  const { data: newSession } = await adminClient
    .from("chat_sessions")
    .insert({ customer_id: customerId, flow_id: flow.id, current_node_id: null, variables: { __awaiting_name: "true" }, status: "active" })
    .select().single();
  if (newSession) {
    try { await sendWhatsAppText(inst, phone, "Olá! Como você gostaria de ser chamado(a)?"); } catch (_) {}
  }
}
```

**3. Variáveis disponíveis nos fluxos:** `{{nome}}` e `{{name}}` ficam disponíveis em qualquer nó de mensagem via `replaceVariables`.

### Resultado
- Primeira interação: pergunta o nome
- Usuário responde: armazena em `variables.nome` + atualiza tabela `customers`
- Sessões futuras: se já tem nome real, usa direto sem perguntar
- A qualquer momento: "mude meu nome para X" atualiza e confirma
- Respostas inválidas: pede novamente educadamente
- `{{nome}}` funciona em todos os nós de mensagem do fluxo

### Arquivo alterado
- `supabase/functions/whatsapp-webhook/index.ts`

### Deploy
- Re-deploy da edge function `whatsapp-webhook`

