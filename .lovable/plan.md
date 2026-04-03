

## Corrigir fluxo: saudação + menu de seleção de veículos

### Problema atual
O webhook tem **mensagens duplicadas/conflitantes**:
1. Para usuários que já têm nome: linha 920 envia `"Olá, {nome}! Como posso ajudar?"` hardcoded, e depois `processFlow` executa o nó de boas-vindas que envia **outra** saudação.
2. Para novos usuários: após capturar o nome, `processFlow` começa no nó de boas-vindas — OK, mas a saudação do nó e o menu estão desconectados do comportamento real.
3. O menu `menu_list` pode estar caindo no fallback de texto porque a API WhatsApi espera um formato específico para `sections`.

### O que será feito

**1. Corrigir o webhook** (`supabase/functions/whatsapp-webhook/index.ts`)

- **Usuário com nome** (linha 913-922): Remover a mensagem hardcoded `"Olá, {nome}! Como posso ajudar?"`. Deixar o `processFlow` executar normalmente — o nó de boas-vindas já envia a saudação com `{{nome}}`.
- **Novo usuário após captura de nome** (linha 843-865): Já está correto — inicia o fluxo no primeiro nó.

**2. Ajustar o formato do menu_list na API** (mesmo arquivo)

Verificar e corrigir o payload do `sendWhatsAppMenu` para `menu_list` (linhas 347-361). O formato `sections` precisa ter `rows` (não `items`) para a API WhatsApi:

```typescript
// Converter items → rows com rowId para a API
const apiSections = sections.map(s => ({
  title: s.title,
  rows: (s.items || s.rows || []).map((it, i) => ({
    title: it.title,
    description: it.description || "",
    rowId: it.id || `row_${i}`,
  })),
}));
await sendWhatsAppMenu(inst, phone, "list", menuText, { sections: apiSections, listButton });
```

**3. Re-deploy** a edge function `whatsapp-webhook`.

### Resultado esperado
1. Usuário manda "oi" → bot pergunta o nome
2. Usuário responde "Felipe" → nome salvo, fluxo inicia
3. Nó 1: `"Olá, Felipe! 👋 Qual carro você deseja alugar?"`
4. Nó 2: Menu de seleção nativo do WhatsApp com botão "Ver opções" → lista com Sedan, SUV, Hatch, Pickup

### Arquivos alterados
- `supabase/functions/whatsapp-webhook/index.ts` — remover mensagem duplicada + corrigir formato sections do menu_list

