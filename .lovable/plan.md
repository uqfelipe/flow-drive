

# Integração WhatsApp (WhatsApi/uazapi) — Single-Tenant sem Auth

## Resumo
Implementar a integração completa com a API WhatsApi conforme a documentação fornecida, adaptada para funcionar sem autenticação (user_id fixo para single-tenant). Inclui nova tabela, duas Edge Functions e frontend renovado com QR Code, polling e gerenciamento de instância.

---

## 1. Banco de Dados

### Criar tabela `whatsapp_instances` (migration)
```sql
CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'admin',
  instance_name TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'LocadoraCRM',
  server_url TEXT NOT NULL,
  instance_token TEXT NOT NULL,
  token TEXT NOT NULL,
  webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_connection_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS permissiva (sem auth por enquanto)
CREATE POLICY "Allow all" ON public.whatsapp_instances
  FOR ALL TO public USING (true) WITH CHECK (true);
```

A tabela `whatsapp_config` existente permanece (configuração geral). A nova `whatsapp_instances` armazena dados da instância real na API.

---

## 2. Secrets

Solicitar ao usuário via ferramenta `add_secret`:
- **`WHATSAPI_API_TOKEN`** — Token da conta na WhatsApi
- **`WHATSAPI_CREATE_URL`** — URL do proxy de criação de instância

---

## 3. Edge Function: `whatsapp-manage`

Ações via `{ action }` no body:

| Action | Comportamento |
|--------|--------------|
| `get-or-create` | Busca instância por user_id. Se não existe, chama API para criar + registra webhook automaticamente |
| `qrcode` | POST `{server_url}/instance/connect` → retorna QR base64 ou `connected: true` |
| `disconnect` | Atualiza banco: status=disconnected, is_connected=false |
| `delete` | DELETE na API (resiliente) + remove do banco |

Sem validação JWT (single-tenant). Usa `service_role_key` para DB.
Registro automático do webhook na API uazapi após criação com `excludeMessages`, `events`, etc.

---

## 4. Edge Function: `whatsapp-webhook`

Recebe POST da API uazapi com `user_id` na query string.
Atualiza `whatsapp_instances`:
- `connection`/`CONNECTED`/`connected:true` → status=connected
- `disconnected`/`DISCONNECTED`/`connected:false` → status=disconnected

---

## 5. Frontend: `WhatsAppConfig.tsx` reescrito

Nova interface com estados visuais:

- **Loading**: Skeleton enquanto busca instância
- **QR Code**: Exibe `<img src={base64}>` para escanear (sem dangerouslySetInnerHTML)
- **Conectado**: Card verde com info da instância
- **Erro**: Mensagem + botão "Tentar novamente"

Funcionalidades:
- Ao montar: chama `get-or-create` via `supabase.functions.invoke("whatsapp-manage")`
- Se não conectado: busca QR automaticamente
- Polling a cada 15s verificando status
- Botão "Reconectar": disconnect → get-or-create → qrcode
- Botão "Remover Instância": delete → limpa estado
- Card de configurações da API (URL base, token) mantido usando a tabela `whatsapp_config` existente

---

## 6. Hook: `use-whatsapp.ts`

Hook dedicado com funções:
- `callManageFunction(action)` — wrapper para `supabase.functions.invoke`
- Estado: `instance`, `qrCode`, `loading`, `error`
- Polling automático com `useEffect` + `setInterval(15s)`

---

## Arquivos modificados/criados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `whatsapp_instances` |
| `supabase/functions/whatsapp-manage/index.ts` | Edge Function principal |
| `supabase/functions/whatsapp-webhook/index.ts` | Edge Function webhook |
| `src/hooks/use-whatsapp.ts` | Hook de gerenciamento |
| `src/pages/WhatsAppConfig.tsx` | Reescrita completa do frontend |

