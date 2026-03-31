

# Plano: Criar documentação técnica completa da integração WhatsApp

## Objetivo
Gerar um arquivo `WHATSAPP_IMPLEMENTATION_GUIDE.md` na raiz do projeto contendo a documentação técnica completa e detalhada da integração WhatsApp, baseada inteiramente no código real implementado.

## Conteúdo do arquivo

O arquivo cobrirá todas as 15 seções solicitadas, extraídas do código real:

### Dados reais confirmados no código:

**Arquivos envolvidos:**
- `supabase/functions/whatsapp-manage/index.ts` — Edge Function principal (get-or-create, qrcode, disconnect, delete)
- `supabase/functions/whatsapp-webhook/index.ts` — Edge Function de webhook
- `src/hooks/use-whatsapp.ts` — Hook React de gerenciamento
- `src/pages/WhatsAppConfig.tsx` — Página frontend
- Migration SQL `20260331172915` — Tabela `whatsapp_instances`

**Tabela:** `whatsapp_instances` com 13 colunas (id, user_id, instance_name, device_name, server_url, instance_token, token, webhook_url, status, is_connected, last_connection_at, created_at, updated_at)

**Secrets:** `WHATSAPI_API_TOKEN`, `WHATSAPI_CREATE_URL`, `WHATSAPI_PROXY_APIKEY` (não usado no código final), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Endpoints externos:**
- Criação: `POST {WHATSAPI_CREATE_URL}` com body `{token, name, deviceName}`
- QR Code: `POST {server_url}/instance/connect` com header `token: {instance_token}`
- Webhook registro: `POST {server_url}/webhook` com header `token: {instance_token}`
- Delete: `DELETE {server_url}/instance` com header `token: {instance_token}`

**Rota frontend:** `/whatsapp`

**Polling:** 15s via `setInterval` no hook, chama `get-or-create` e verifica `is_connected`

**Problemas reais encontrados e resolvidos:**
1. 405 por URL errada no secret `WHATSAPI_CREATE_URL`
2. 405 por headers extras (`apikey`, `Authorization`) que o proxy rejeitava
3. Múltiplas tentativas de fallback desnecessárias

## Ação

Criar um único arquivo `WHATSAPP_IMPLEMENTATION_GUIDE.md` na raiz do projeto com ~3000-4000 linhas de documentação técnica completa, incluindo exemplos reais de request/response extraídos dos network logs, SQL completo, código completo das funções, e guia de replicação passo a passo.

