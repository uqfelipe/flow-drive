

## Capturar Arquivo, Imagem e Áudio no Flow Builder

### O que será feito
Adicionar 3 novos nós de captura na categoria "Entrada de Dados": **Capturar Imagem**, **Capturar Áudio** e **Capturar Arquivo**. Quando o usuário enviar mídia no WhatsApp em resposta a esses nós, o webhook fará download da mídia, salvará a URL no banco de dados (no `custom_fields` do cliente ou numa nova tabela `customer_files`), e armazenará na variável do fluxo.

### Alterações

**1. Nova tabela `customer_files` (migração SQL)**
```sql
create table public.customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  file_type text not null default 'file', -- 'image', 'audio', 'file'
  file_url text not null,
  file_name text default '',
  variable_name text default '',
  created_at timestamptz not null default now()
);
alter table public.customer_files enable row level security;
create policy "Allow all access to customer_files" on public.customer_files for all to public using (true) with check (true);
```

**2. `src/components/flow-builder/nodeTypes.ts`**
- Adicionar 3 novos tipos na categoria "entrada":
  - `capture_image` (ícone Image, cor #10B981) — config: `{ variable, message }`
  - `capture_audio` (ícone Mic, cor #F59E0B) — config: `{ variable, message }`
  - `capture_file` (ícone File, cor #6366F1) — config: `{ variable, message }`

**3. `src/components/flow-builder/NodeConfigPanel.tsx`**
- Nenhuma alteração necessária — já existe o bloco genérico para `data.category === "entrada"` que renderiza campo de variável + mensagem de prompt.

**4. `supabase/functions/whatsapp-webhook/index.ts`**
- Atualizar `SUPPORTED_NODE_TYPES` com os 3 novos tipos.
- Atualizar `extractIncomingMessages` para extrair URLs de mídia (imagem, áudio, documento) das mensagens recebidas, não só texto.
- No `processFlow`, quando o nó atual é `capture_image`, `capture_audio` ou `capture_file`:
  - Extrair a URL da mídia da mensagem recebida (via campo `mediaUrl` ou fazendo download via API `/download-media`).
  - Salvar o registro na tabela `customer_files` com `customer_id`, `file_type`, `file_url` e `variable_name`.
  - Armazenar a URL na variável do fluxo.
- Atualizar `processIncomingMessage` para passar dados de mídia (não só texto) ao `processFlow`.
- Modificar o filtro de mensagens válidas para aceitar mensagens com mídia mesmo sem texto.

### Fluxo de funcionamento
1. Bot envia a mensagem de prompt do nó (ex: "Envie uma foto do documento")
2. Usuário envia imagem/áudio/arquivo no WhatsApp
3. Webhook recebe a mensagem com mídia, extrai a URL
4. Salva na tabela `customer_files` e na variável do fluxo
5. Fluxo continua para o próximo nó

