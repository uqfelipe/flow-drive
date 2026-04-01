
## O que encontrei
- A tela de Conversas busca chats e mensagens direto da API via `whatsapp-chat`, então “a conversa aparecer no painel” não prova que o `whatsapp-webhook` está recebendo eventos.
- O `whatsapp-webhook` escolhe um fluxo com `.eq("status", "active").limit(1)` sem ordenação. Se houver mais de um fluxo ativo, ele pode pegar qualquer um.
- Existe um fluxo seedado no banco já com status `active`, usando node types antigos (`message_received`, `send_options`, `wait_response`, `if_else`, `search_vehicles`) que o motor atual não suporta. Resultado: o fluxo passa pelos nós e não envia resposta.
- `src/pages/FlowBuilder.tsx` hoje não carrega os nós reais do banco: ele sempre monta `initialNodes` e `initialEdges` hardcoded. Isso pode fazer você editar/salvar uma coisa e o webhook executar outra.
- O webhook da instância WhatsApp só é registrado na criação. Se a instância já existia, o sistema reaproveita sem re-sincronizar o webhook.
- `sendWhatsAppText` falha em silêncio: ele apenas loga erro e o fluxo continua como se tivesse enviado.

## Plano
1. Corrigir o Flow Builder para refletir o banco de verdade
- Carregar `name`, `status`, `nodes` e `edges` reais do fluxo salvo.
- Remover a injeção automática de `initialNodes/initialEdges` na abertura.
- Garantir que o botão Salvar persista exatamente o fluxo exibido na tela.

2. Garantir um único fluxo ativo
- Ao salvar um fluxo como `active`, desativar os demais fluxos.
- Ajustar o webhook para escolher o fluxo ativo de forma determinística (`updated_at desc`).
- Limpar/desativar fluxos antigos seedados que ainda estejam ativos.

3. Reforçar a sincronização do webhook do WhatsApp
- Extrair um helper de registro do webhook em `whatsapp-manage`.
- Re-registrar o webhook também quando a instância já existir (`get-or-create`), não só na criação.
- Fazer a mesma sincronização em reconexão/QR code.

4. Melhorar o motor de resposta automática
- Logar claramente: evento recebido, telefone, texto, fluxo escolhido, nó inicial e resultado do envio.
- Fazer `sendWhatsAppText` lançar erro com status/body da API quando `/send/text` falhar.
- Bloquear ou ignorar fluxos com node types não suportados pelo engine atual.

5. Validar o fluxo antes de considerar “ativo”
- Verificar se existe nó inicial válido.
- Verificar se há pelo menos um caminho com tipos suportados pelo motor atual.
- Se não passar, impedir ativação ou mostrar erro claro no save.

## Detalhes técnicos
- Arquivos principais:
  - `src/pages/FlowBuilder.tsx`
  - `src/hooks/use-flows.ts`
  - `supabase/functions/whatsapp-manage/index.ts`
  - `supabase/functions/whatsapp-webhook/index.ts`
- Causa mais provável do problema:
  1. o webhook pode não estar sincronizado com a instância atual;
  2. o webhook pode estar executando um fluxo antigo `active` e incompatível.
- Evidência forte:
  - o banco já nasce com um fluxo antigo ativo;
  - o engine atual não suporta vários tipos desse fluxo;
  - o builder não mostra fielmente o conteúdo salvo no banco.

## Resultado esperado
- O fluxo visível no builder será o mesmo executado pelo webhook.
- Só existirá um fluxo ativo por vez.
- Quando chegar mensagem no WhatsApp, o sistema escolherá o fluxo certo e responderá automaticamente.
