

## Corrigir Enquete (Poll) no Flow Builder

### Problemas identificados

1. **Respostas da enquete são filtradas**: Quando o usuário vota na enquete, a uazapi envia uma mensagem com `text=""` e `content.selectedDisplayText="Opção escolhida"`. O webhook filtra essa mensagem porque `text` está vazio (linha 1037).

2. **Poll não aguarda resposta**: O nó `poll` envia a enquete e imediatamente pula para o próximo nó (`continue` na linha 625), sem pausar para esperar o voto do usuário.

3. **Poll não está no tratamento de seleção**: Na linha 1247, `poll` não está incluído na lista de tipos que processam respostas de menu. Também não há caso `poll` na função `handleMenuSelection`.

### Alterações

**1. `supabase/functions/whatsapp-webhook/index.ts` — `extractIncomingMessages` (~linha 819)**
- Extrair `content.selectedDisplayText` como texto quando `text` está vazio (resposta de enquete/botão)
- Isso resolve o filtro que descarta respostas de poll

**2. `supabase/functions/whatsapp-webhook/index.ts` — processFlow, nó `poll` (~linha 613)**
- Após enviar a enquete, retornar `status: "waiting"` em vez de `continue`, para aguardar o voto do usuário (igual ao `menu_buttons`)

**3. `supabase/functions/whatsapp-webhook/index.ts` — tratamento de seleção (~linha 1247)**
- Adicionar `poll` à lista: `nt === "menu_text" || ... || nt === "poll"`

**4. `supabase/functions/whatsapp-webhook/index.ts` — `handleMenuSelection` (~linha 709)**
- Adicionar caso `poll`: comparar a resposta do usuário com as opções da enquete (por texto ou índice numérico)

### Resumo
A enquete será enviada, o bot aguardará o voto, e quando o usuário responder, o fluxo continuará pelo handle correto da opção selecionada.

