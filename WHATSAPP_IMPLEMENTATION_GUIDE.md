# Guia Completo de Implementação — Integração WhatsApp (uazapi/WhatsApi)

> **Projeto de referência:** Sistema de gestão para locadora de veículos com chatbot WhatsApp  
> **Stack:** React 18 + Vite + TypeScript + Supabase (externo) + Tailwind CSS  
> **Modelo:** Single-tenant (sem autenticação de usuário)  
> **Data da implementação:** 31/03/2026  

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Fluxo Completo Passo a Passo](#2-fluxo-completo-passo-a-passo)
3. [Exemplos Reais da Implementação](#3-exemplos-reais-da-implementação)
4. [Endpoints Usados](#4-endpoints-usados)
5. [Exemplos Reais de Request e Response](#5-exemplos-reais-de-request-e-response)
6. [Estrutura do Banco de Dados](#6-estrutura-do-banco-de-dados)
7. [Frontend](#7-frontend)
8. [Backend / Edge Functions / Supabase](#8-backend--edge-functions--supabase)
9. [Webhook](#9-webhook)
10. [ENV e Configurações](#10-env-e-configurações)
11. [Lógica de Reutilização da Instância](#11-lógica-de-reutilização-da-instância)
12. [Erros e Correções Importantes](#12-erros-e-correções-importantes)
13. [Passo a Passo para Replicar em Outro Projeto](#13-passo-a-passo-para-replicar-em-outro-projeto)
14. [Checklist Final](#14-checklist-final)

---

## 1. Visão Geral da Arquitetura

### Diagrama de alto nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  src/pages/WhatsAppConfig.tsx  ←→  src/hooks/use-whatsapp.ts    │
│                                                                 │
│  Usa supabase.functions.invoke("whatsapp-manage", { body })     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS POST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTIONS (Deno)                     │
│                                                                 │
│  whatsapp-manage/index.ts                                       │
│    ├─ action: "get-or-create" → busca ou cria instância         │
│    ├─ action: "qrcode"        → busca QR Code para conexão      │
│    ├─ action: "disconnect"    → marca como desconectado no DB    │
│    └─ action: "delete"        → deleta da API + do DB           │
│                                                                 │
│  whatsapp-webhook/index.ts                                      │
│    └─ POST com ?user_id=admin → atualiza status no DB           │
└──────────┬──────────────────────────────┬───────────────────────┘
           │                              │
           │ fetch() para API externa     │ Supabase client (service_role)
           ▼                              ▼
┌──────────────────────┐    ┌─────────────────────────────────────┐
│   API WhatsApi       │    │        SUPABASE DATABASE            │
│   (uazapi)           │    │                                     │
│                      │    │  Tabela: whatsapp_instances          │
│  Proxy de criação:   │    │    - id, user_id, instance_name     │
│  {CREATE_URL}        │    │    - server_url, instance_token     │
│                      │    │    - status, is_connected            │
│  Servidor da inst:   │    │    - webhook_url, etc.              │
│  {server_url}/*      │    │                                     │
└──────────────────────┘    └─────────────────────────────────────┘
```

### Onde cada parte roda

| Camada | Onde roda | Responsabilidade |
|--------|-----------|------------------|
| **Frontend** | Navegador do usuário | Interface visual, botões, exibição de QR Code, polling de status |
| **Edge Function `whatsapp-manage`** | Supabase Edge Functions (Deno) | Toda lógica de negócio: criar instância, buscar QR, desconectar, deletar |
| **Edge Function `whatsapp-webhook`** | Supabase Edge Functions (Deno) | Recebe eventos push da API uazapi e atualiza o banco |
| **Banco de dados** | Supabase PostgreSQL | Persistência da instância, status, tokens |
| **API externa (uazapi)** | Servidor remoto (ex: `https://ipazua.uazapi.com`) | Gerenciamento real da instância WhatsApp, geração de QR Code, envio de mensagens |
| **Proxy de criação** | Supabase Edge Function separada (outro projeto) | Intermediário para criar instâncias na API uazapi |

### Fluxo de conexão resumido

1. Frontend chama Edge Function `whatsapp-manage` com `action: "get-or-create"`
2. Edge Function verifica se já existe instância no banco
3. Se não existe, chama o proxy de criação (`WHATSAPI_CREATE_URL`) para criar
4. Após criação, registra webhook na API uazapi e salva tudo no banco
5. Frontend recebe dados da instância e, se não conectada, busca QR Code
6. Usuário escaneia QR Code no celular
7. API uazapi envia evento de conexão via webhook → Edge Function `whatsapp-webhook` atualiza status
8. Polling do frontend detecta `is_connected: true` e atualiza a interface

### Fluxo de desconexão

1. Frontend chama `whatsapp-manage` com `action: "disconnect"`
2. Edge Function atualiza banco: `status = "disconnected"`, `is_connected = false`
3. Interface atualiza para mostrar estado desconectado

### Fluxo de exclusão

1. Frontend chama `whatsapp-manage` com `action: "delete"`
2. Edge Function busca `server_url` e `instance_token` do banco
3. Chama `DELETE {server_url}/instance` na API uazapi (resiliente a falhas)
4. Deleta o registro da tabela `whatsapp_instances`
5. Frontend limpa o estado e volta ao estado inicial

### Fluxo de envio de mensagens

**Nota:** O envio de mensagens não foi implementado no frontend neste projeto. A infraestrutura está pronta (instância conectada, `server_url` e `instance_token` salvos no banco), mas a funcionalidade de envio precisaria de uma Edge Function adicional que:
1. Busque `server_url` e `instance_token` do banco
2. Faça `POST {server_url}/message/send-text` com header `token: {instance_token}` e body com número e mensagem

---

## 2. Fluxo Completo Passo a Passo

### Ordem cronológica completa

#### Fase 1: Inicialização (ao abrir a página `/whatsapp`)

1. **Usuário acessa `/whatsapp`** → componente `WhatsAppConfig` é montado
2. **Hook `useWhatsApp` é inicializado** → `useEffect` chama `loadInstance()` automaticamente
3. **`loadInstance()` executa**:
   - Seta `loading = true`, `error = null`
   - Usa `lockRef` para evitar chamadas duplicadas
   - Chama `supabase.functions.invoke("whatsapp-manage", { body: { action: "get-or-create" } })`

#### Fase 2: Verificação/Criação da Instância (Edge Function)

4. **Edge Function `whatsapp-manage` recebe `action: "get-or-create"`**
5. **Consulta banco**: `SELECT * FROM whatsapp_instances WHERE user_id = 'admin' LIMIT 1`
6. **Se já existe instância** → retorna `{ instance: {...}, is_new: false }`
7. **Se NÃO existe**:
   - Gera nome único: `locadora-{timestamp}` (ex: `locadora-1774979111559`)
   - Chama proxy de criação:
     ```
     POST {WHATSAPI_CREATE_URL}
     Content-Type: application/json
     Body: { "token": "{WHATSAPI_API_TOKEN}", "name": "locadora-1774979111559", "deviceName": "LocadoraCRM" }
     ```
   - Recebe resposta com `server_url`, `Instance Token`, `token`
   - Registra webhook na API uazapi:
     ```
     POST {server_url}/webhook
     Headers: { "Content-Type": "application/json", "token": "{instance_token}" }
     Body: { url, enabled, active, events, excludeMessages, ... }
     ```
   - Salva tudo no banco (`INSERT INTO whatsapp_instances`)
   - Retorna `{ instance: {...}, is_new: true }`

#### Fase 3: Busca do QR Code (automática)

8. **Frontend verifica `instance.is_connected`**
9. **Se `is_connected === false`**, chama automaticamente `callManage("qrcode")`
10. **Edge Function `handleQrCode`**:
    - Busca instância do banco
    - Chama `POST {server_url}/instance/connect` com header `token: {instance_token}`
    - Se já conectado → atualiza banco e retorna `{ connected: true }`
    - Se não conectado → retorna `{ connected: false, qrcode: "data:image/png;base64,..." }`
11. **Frontend recebe QR Code** → seta `qrCode` no estado → imagem aparece na tela

#### Fase 4: Conexão pelo usuário

12. **Usuário abre WhatsApp no celular** → Menu → Aparelhos conectados → Conectar aparelho → Escaneia o QR Code
13. **API uazapi detecta a conexão** → envia POST para o webhook configurado:
    ```
    POST {SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=admin
    Body: { "event": "connection", "connected": true, ... }
    ```
14. **Edge Function `whatsapp-webhook` recebe o evento**:
    - Extrai `user_id` da query string
    - Detecta que é um evento de conexão
    - Atualiza banco: `status = "connected"`, `is_connected = true`, `last_connection_at = now()`

#### Fase 5: Detecção automática pelo frontend

15. **Polling a cada 15 segundos** (no hook `useWhatsApp`):
    - `setInterval` chama `callManage("get-or-create")` a cada 15s
    - Verifica `data.instance.is_connected`
    - Quando detecta `true`:
      - Atualiza estado `instance`
      - Limpa `qrCode`
      - Mostra toast "WhatsApp conectado!"
      - Polling para (pois `instance.is_connected === true` faz o `useEffect` não registrar novo interval)

#### Fase 6: Estado conectado

16. **Interface muda para card verde** com informações da instância
17. **Botão "Reconectar" disponível** → chama `disconnect` → `get-or-create` → `qrcode`
18. **Botão "Remover Instância" disponível** → chama `delete` → limpa estado

---

## 3. Exemplos Reais da Implementação

### Arquivos reais do projeto

| Arquivo | Tipo | Responsabilidade |
|---------|------|------------------|
| `supabase/functions/whatsapp-manage/index.ts` | Edge Function (Deno) | Lógica principal: criar, buscar QR, desconectar, deletar |
| `supabase/functions/whatsapp-webhook/index.ts` | Edge Function (Deno) | Receber eventos push da API uazapi |
| `src/hooks/use-whatsapp.ts` | Hook React | Gerenciar estado da instância, polling, chamadas à Edge Function |
| `src/pages/WhatsAppConfig.tsx` | Página React | Interface visual completa |
| `src/integrations/supabase/client.ts` | Client Supabase | Singleton do client Supabase usado no frontend |

### Nomes reais das funções

| Função | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `handleGetOrCreate()` | `whatsapp-manage/index.ts` | Busca ou cria instância |
| `handleQrCode()` | `whatsapp-manage/index.ts` | Busca QR Code para conexão |
| `handleDisconnect()` | `whatsapp-manage/index.ts` | Marca instância como desconectada |
| `handleDelete()` | `whatsapp-manage/index.ts` | Deleta instância da API e do banco |
| `sanitize(inst)` | `whatsapp-manage/index.ts` | Remove `instance_token` e `token` antes de retornar ao frontend |
| `json(data, status)` | `whatsapp-manage/index.ts` | Helper para criar Response JSON com CORS |
| `useWhatsApp()` | `use-whatsapp.ts` | Hook principal do frontend |
| `callManage(action)` | `use-whatsapp.ts` | Wrapper para `supabase.functions.invoke` |
| `loadInstance()` | `use-whatsapp.ts` | Busca/cria instância e QR Code automaticamente |
| `fetchQrCode()` | `use-whatsapp.ts` | Busca apenas QR Code |
| `reconnect()` | `use-whatsapp.ts` | Desconecta → recria → busca QR |
| `deleteInstance()` | `use-whatsapp.ts` | Remove instância |

### Tabela real

- **Nome**: `whatsapp_instances`
- **Schema**: `public`

### Colunas reais

| Coluna | Tipo | Nullable | Default | Propósito |
|--------|------|----------|---------|-----------|
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `user_id` | `text` | No | `'admin'` | Identificador do tenant (fixo em single-tenant) |
| `instance_name` | `text` | No | — | Nome gerado: `locadora-{timestamp}` |
| `device_name` | `text` | No | `'LocadoraCRM'` | Nome do dispositivo na API |
| `server_url` | `text` | No | — | URL do servidor uazapi (ex: `https://ipazua.uazapi.com`) |
| `instance_token` | `text` | No | — | Token da instância na API uazapi (**SENSÍVEL, nunca vai ao frontend**) |
| `token` | `text` | No | — | Nome/label do token na API (**SENSÍVEL, nunca vai ao frontend**) |
| `webhook_url` | `text` | Yes | — | URL do webhook registrado |
| `status` | `text` | No | `'created'` | Status atual: `created`, `connecting`, `connected`, `disconnected` |
| `is_connected` | `boolean` | No | `false` | Flag booleana de conexão ativa |
| `last_connection_at` | `timestamptz` | Yes | — | Última vez que conectou |
| `created_at` | `timestamptz` | No | `now()` | Data de criação |
| `updated_at` | `timestamptz` | No | `now()` | Última atualização |

### Variáveis de ambiente reais

| Secret | Valor real (formato) | Onde é usada |
|--------|---------------------|--------------|
| `WHATSAPI_API_TOKEN` | `mvYUQdH9gbfHQM8ozQZ8MGau5dDSTQ2pFW8a` | Edge Function `whatsapp-manage` — body da criação |
| `WHATSAPI_CREATE_URL` | `https://grlwciflaotripbumhve.supabase.co/functions/v1/create-instance-url` | Edge Function `whatsapp-manage` — URL do proxy |
| `SUPABASE_URL` | `https://umsyxiztgfiedtibxjeo.supabase.co` | Edge Functions — client e webhook URL |
| `SUPABASE_SERVICE_ROLE_KEY` | (auto-configurado pelo Supabase) | Edge Functions — acesso admin ao banco |
| `WHATSAPI_PROXY_APIKEY` | (existe mas **NÃO é usado** no código final) | Não utilizado |

### Rota real no frontend

- **Caminho**: `/whatsapp`
- **Componente**: `WhatsAppConfig` (importado de `src/pages/WhatsAppConfig.tsx`)
- **Definido em**: `src/App.tsx` como `<Route path="/whatsapp" element={<WhatsAppConfig />} />`

---

## 4. Endpoints Usados

### 4.1. Criação de Instância (via Proxy)

| Item | Valor |
|------|-------|
| **Finalidade** | Criar uma nova instância WhatsApp na API uazapi |
| **Método** | `POST` |
| **URL** | `{WHATSAPI_CREATE_URL}` → real: `https://grlwciflaotripbumhve.supabase.co/functions/v1/create-instance-url` |
| **Headers** | `Content-Type: application/json` (apenas este, **sem** `Authorization`, **sem** `apikey`) |
| **Body** | `{ "token": "{WHATSAPI_API_TOKEN}", "name": "locadora-{timestamp}", "deviceName": "LocadoraCRM" }` |
| **Resposta esperada** | `{ "server_url": "...", "Instance Token": "...", "token": "...", "instance": {...}, "webhook": "" }` |
| **Tratamento de erro** | Se `!createRes.ok`, lança erro com `status` e body de resposta |
| **Quando é chamado** | Dentro de `handleGetOrCreate()`, apenas quando não existe instância no banco |
| **Arquivo** | `supabase/functions/whatsapp-manage/index.ts` → `handleGetOrCreate()` |

### 4.2. Registro de Webhook

| Item | Valor |
|------|-------|
| **Finalidade** | Registrar URL de webhook na API uazapi para receber eventos |
| **Método** | `POST` |
| **URL** | `{server_url}/webhook` (ex: `https://ipazua.uazapi.com/webhook`) |
| **Headers** | `Content-Type: application/json`, `token: {instance_token}` |
| **Body** | Ver seção 5.7 |
| **Resposta esperada** | Status 200 com confirmação |
| **Tratamento de erro** | Falha é logada mas **não bloqueia** a criação (try/catch com continue) |
| **Quando é chamado** | Imediatamente após criar a instância, dentro de `handleGetOrCreate()` |
| **Arquivo** | `supabase/functions/whatsapp-manage/index.ts` → `handleGetOrCreate()` |

### 4.3. Conexão / QR Code

| Item | Valor |
|------|-------|
| **Finalidade** | Obter QR Code para o usuário escanear, ou confirmar que já está conectado |
| **Método** | `POST` |
| **URL** | `{server_url}/instance/connect` (ex: `https://ipazua.uazapi.com/instance/connect`) |
| **Headers** | `Content-Type: application/json`, `token: {instance_token}` |
| **Body** | `{}` (objeto vazio) |
| **Resposta (conectado)** | `{ "connected": true, "instance": { "status": "connected" } }` |
| **Resposta (não conectado)** | `{ "connected": false, "instance": { "qrcode": "data:image/png;base64,..." } }` ou `{ "qrcode": "..." }` |
| **Tratamento de erro** | Se `!qrRes.ok`, lança erro com status |
| **Quando é chamado** | 1) Automaticamente após `get-or-create` se `is_connected === false`. 2) Ao clicar "Gerar QR Code" ou "Atualizar QR". 3) Durante reconexão. |
| **Arquivo** | `supabase/functions/whatsapp-manage/index.ts` → `handleQrCode()` |

### 4.4. Desconexão

| Item | Valor |
|------|-------|
| **Finalidade** | Marcar instância como desconectada no banco |
| **Método** | N/A (não chama API externa, apenas atualiza banco) |
| **Ação no banco** | `UPDATE whatsapp_instances SET status = 'disconnected', is_connected = false WHERE user_id = 'admin'` |
| **Quando é chamado** | Primeira etapa do fluxo de reconexão |
| **Arquivo** | `supabase/functions/whatsapp-manage/index.ts` → `handleDisconnect()` |

### 4.5. Exclusão da Instância

| Item | Valor |
|------|-------|
| **Finalidade** | Deletar instância da API uazapi e do banco local |
| **Método** | `DELETE` |
| **URL** | `{server_url}/instance` (ex: `https://ipazua.uazapi.com/instance`) |
| **Headers** | `token: {instance_token}` |
| **Body** | Nenhum |
| **Resposta esperada** | Status 200 |
| **Tratamento de erro** | Falha na API é logada mas **não bloqueia** a exclusão do banco (resiliente) |
| **Quando é chamado** | Ao clicar "Remover Instância" |
| **Arquivo** | `supabase/functions/whatsapp-manage/index.ts` → `handleDelete()` |

### 4.6. Webhook (recebimento de eventos)

| Item | Valor |
|------|-------|
| **Finalidade** | Receber eventos push da API uazapi (conexão, desconexão, mensagens) |
| **Método** | `POST` (recebido, não enviado) |
| **URL** | `{SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=admin` |
| **Quem chama** | API uazapi automaticamente |
| **Body recebido** | Varia conforme evento (ver seção 9) |
| **Arquivo** | `supabase/functions/whatsapp-webhook/index.ts` |

### 4.7. Edge Function do Frontend

| Item | Valor |
|------|-------|
| **Finalidade** | Ponto de entrada único do frontend para todas as ações |
| **Método** | `POST` |
| **URL** | `{SUPABASE_URL}/functions/v1/whatsapp-manage` |
| **Headers** | Automáticos via `supabase.functions.invoke` (inclui `apikey` e `authorization` do client) |
| **Body** | `{ "action": "get-or-create" | "qrcode" | "disconnect" | "delete" }` |
| **Arquivo frontend** | `src/hooks/use-whatsapp.ts` → `callManage()` |

---

## 5. Exemplos Reais de Request e Response

### 5.1. Criar Instância (via Proxy)

**Request:**
```http
POST https://grlwciflaotripbumhve.supabase.co/functions/v1/create-instance-url
Content-Type: application/json

{
  "token": "mvYUQdH9gbfHQM8ozQZ8MGau5dDSTQ2pFW8a",
  "name": "locadora-1774979111559",
  "deviceName": "LocadoraCRM"
}
```

**Response de sucesso (200):**
```json
{
  "server_url": "https://ipazua.uazapi.com",
  "Instance Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token": "Nome do Token",
  "instance": {
    "name": "✔️locadora-1774979111559",
    "device_name": "LocadoraCRM"
  },
  "webhook": ""
}
```

**Response de erro (400):**
```json
{ "error": "Missing required parameters: token, name" }
```

**Response de erro (401):**
```json
{ "error": "Token inválido ou expirado" }
```

**Response de erro (403):**
```json
{ "error": "Saldo insuficiente" }
```

**O que o sistema faz com a resposta:**
- Extrai `server_url`, `Instance Token` (ou `instance_token`), e `token`
- Valida que `server_url` e `instanceToken` existem
- Registra webhook na API
- Salva tudo na tabela `whatsapp_instances`

### 5.2. Buscar QR Code / Conectar Instância

**Request:**
```http
POST https://ipazua.uazapi.com/instance/connect
Content-Type: application/json
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{}
```

**Response quando NÃO conectado (200):**
```json
{
  "connected": false,
  "instance": {
    "status": "connecting",
    "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

**Response quando JÁ conectado (200):**
```json
{
  "connected": true,
  "instance": {
    "status": "connected"
  }
}
```

**O que o sistema faz:**
- Se `connected === true` → atualiza banco para `connected`, retorna `{ connected: true }`
- Se `connected === false` → atualiza banco para `connecting`, retorna QR Code base64
- Frontend exibe o QR Code como `<img src={qrcode} />`

### 5.3. Desconectar

**Não chama API externa.** Apenas atualiza o banco:

```sql
UPDATE whatsapp_instances
SET status = 'disconnected', is_connected = false, updated_at = now()
WHERE user_id = 'admin';
```

**Response da Edge Function:**
```json
{ "success": true }
```

### 5.4. Deletar Instância

**Request para a API:**
```http
DELETE https://ipazua.uazapi.com/instance
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Depois, deleta do banco:**
```sql
DELETE FROM whatsapp_instances WHERE user_id = 'admin';
```

**Response da Edge Function:**
```json
{ "deleted": true }
```

### 5.5. Frontend → Edge Function (get-or-create)

**Request real capturado:**
```http
POST https://umsyxiztgfiedtibxjeo.supabase.co/functions/v1/whatsapp-manage
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
x-client-info: supabase-js-web/2.101.1

{"action":"get-or-create"}
```

**Response real capturada (instância existente):**
```json
{
  "instance": {
    "id": "f96156f3-621d-45c6-83a1-e1142852a1ac",
    "user_id": "admin",
    "instance_name": "locadora-1774979111559",
    "device_name": "LocadoraCRM",
    "server_url": "https://ipazua.uazapi.com",
    "webhook_url": "https://umsyxiztgfiedtibxjeo.supabase.co/functions/v1/whatsapp-webhook?user_id=admin",
    "status": "connected",
    "is_connected": true,
    "last_connection_at": "2026-03-31T17:48:02.929+00:00",
    "created_at": "2026-03-31T17:45:14.511078+00:00",
    "updated_at": "2026-03-31T17:48:02.929+00:00"
  },
  "is_new": false
}
```

**Nota:** Os campos `instance_token` e `token` são **removidos** pela função `sanitize()` antes de retornar ao frontend.

### 5.6. Frontend → Edge Function (qrcode)

**Request:**
```json
{"action":"qrcode"}
```

**Response (não conectado):**
```json
{
  "connected": false,
  "qrcode": "data:image/png;base64,iVBORw0KGgo..."
}
```

**Response (já conectado):**
```json
{
  "connected": true,
  "qrcode": ""
}
```

### 5.7. Registro de Webhook na API uazapi

**Request:**
```http
POST https://ipazua.uazapi.com/webhook
Content-Type: application/json
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "url": "https://umsyxiztgfiedtibxjeo.supabase.co/functions/v1/whatsapp-webhook?user_id=admin",
  "enabled": true,
  "active": true,
  "byApi": true,
  "addUrlEvents": true,
  "addUrlTypesMessages": true,
  "excludeMessages": ["wasSentByApi", "isGroupYes"],
  "events": [
    "connection", "messages", "messages_update", "presence",
    "call", "contacts", "groups", "labels", "chats",
    "chat_labels", "blocks", "leads", "history", "sender"
  ]
}
```

### 5.8. Webhook Recebido (conexão)

**Request recebido pela Edge Function:**
```http
POST https://umsyxiztgfiedtibxjeo.supabase.co/functions/v1/whatsapp-webhook?user_id=admin
Content-Type: application/json

{
  "event": "connection",
  "connected": true,
  "status": "CONNECTED"
}
```

**O que o sistema faz:** Atualiza `whatsapp_instances` para `is_connected = true`, `status = "connected"`.

---

## 6. Estrutura do Banco de Dados

### Tabela: `whatsapp_instances`

#### SQL de criação (migration real)

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

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.whatsapp_instances
  FOR ALL TO public USING (true) WITH CHECK (true);
```

#### Mapeamento de dados

| Dado | Coluna | Observação |
|------|--------|------------|
| Token da instância na API | `instance_token` | **SENSÍVEL** — nunca exposto ao frontend (removido por `sanitize()`) |
| Nome/label do token | `token` | **SENSÍVEL** — nunca exposto ao frontend |
| ID da instância | `id` | UUID gerado pelo Postgres |
| Identificador do tenant | `user_id` | Fixo `'admin'` em single-tenant |
| URL do servidor uazapi | `server_url` | Ex: `https://ipazua.uazapi.com` |
| Nome da instância | `instance_name` | Ex: `locadora-1774979111559` |
| Status de conexão | `status` | `created`, `connecting`, `connected`, `disconnected` |
| Flag booleana | `is_connected` | `true` ou `false` |
| URL do webhook | `webhook_url` | URL completa com `?user_id=admin` |
| QR Code | **NÃO armazenado** | QR Code é transitório, buscado sob demanda da API |
| Número de telefone | **NÃO armazenado** | A API uazapi gerencia isso; não foi implementado buscar |
| Nome do perfil | **NÃO armazenado** | Idem |

#### Segurança

**RLS (Row Level Security):**
- RLS está **habilitado** na tabela
- Policy **permissiva** (`Allow all`): permite todas as operações para todos os roles
- **Motivo:** Single-tenant sem autenticação. Em multi-tenant, trocar para policies baseadas em `auth.uid()`

**Campos sensíveis:**
- `instance_token` e `token` ficam **apenas no banco** e são acessados **apenas pela Edge Function** (que usa `service_role_key`)
- A função `sanitize()` remove esses campos antes de retornar qualquer dado ao frontend
- O frontend **nunca** recebe os tokens da API

#### Tabela auxiliar: `whatsapp_config`

Existe uma tabela `whatsapp_config` com campos `base_url`, `api_token`, `instance_name`, `webhook_url`, `status`. Esta tabela **não é usada** pela integração atual — foi criada antes da refatoração e está mantida por compatibilidade. A integração real usa apenas `whatsapp_instances`.

### Relação com o usuário

Em single-tenant, `user_id = 'admin'` é fixo. A busca é feita por:

```typescript
const { data: existing } = await adminClient
  .from("whatsapp_instances")
  .select("*")
  .eq("user_id", USER_ID) // USER_ID = "admin"
  .maybeSingle();
```

Cada "usuário" pode ter no máximo **1 instância** (uso de `.maybeSingle()`).

---

## 7. Frontend

### Componente principal: `WhatsAppConfig`

**Arquivo:** `src/pages/WhatsAppConfig.tsx`

#### Estrutura do componente

```tsx
export default function WhatsAppConfig() {
  const {
    instance,    // WhatsAppInstance | null — dados da instância
    qrCode,      // string — QR Code base64 ou vazio
    loading,     // boolean — carregando
    error,       // string | null — mensagem de erro
    loadInstance, // () => Promise<void> — buscar/criar instância
    fetchQrCode,  // () => Promise<void> — buscar QR Code
    reconnect,    // () => Promise<void> — reconectar
    deleteInstance, // () => Promise<void> — remover instância
  } = useWhatsApp();
  // ...
}
```

#### Estados visuais

1. **Loading (sem instância):** Exibe `<Skeleton>` enquanto carrega pela primeira vez
2. **Erro:** Card vermelho com mensagem de erro + botão "Tentar novamente"
3. **Conectado:** Card verde com ícone ✓, nome da instância, última conexão, botões "Reconectar" e "Remover"
4. **Desconectado com QR:** Exibe `<img src={qrCode}>` + instruções + botão "Atualizar QR" + spinner "Verificando conexão automaticamente..."
5. **Desconectado sem QR:** Placeholder de QR Code + botão "Gerar QR Code"

#### Como os botões funcionam

| Botão | Ação | Função chamada |
|-------|------|----------------|
| "Tentar novamente" | Recarrega instância do zero | `loadInstance()` |
| "Gerar QR Code" / "Atualizar QR" | Busca QR Code da API | `fetchQrCode()` |
| "Reconectar" | Desconecta → recria → busca QR | `reconnect()` |
| "Remover Instância" / "Remover" | Deleta instância | `deleteInstance()` |

#### Como o QR Code aparece

```tsx
<img
  src={qrCode}  // ex: "data:image/png;base64,iVBORw0KGgo..."
  alt="QR Code para conexão WhatsApp"
  className="h-full w-full object-contain p-2"
/>
```

O QR Code é uma string base64 retornada pela API uazapi. Ele é exibido diretamente como `src` de uma tag `<img>`. **NÃO usa `dangerouslySetInnerHTML`**.

#### Como o status é atualizado automaticamente

O hook `useWhatsApp` tem um `useEffect` com `setInterval(15000)`:

```typescript
useEffect(() => {
  if (!instance || instance.is_connected) return; // não faz polling se conectado

  const interval = setInterval(async () => {
    const data = await callManage("get-or-create");
    if (data?.instance?.is_connected) {
      setInstance(data.instance);
      setQrCode("");
      toast.success("WhatsApp conectado!");
    }
  }, 15000);

  return () => clearInterval(interval);
}, [instance, callManage]);
```

#### Como o frontend trata loading, sucesso e erro

**Loading:**
- Estado `loading` controla o spinner nos botões (`<Loader2 className="animate-spin" />`)
- Botões ficam `disabled={loading}` durante operações
- No carregamento inicial (sem instância), mostra `<Skeleton>`

**Sucesso:**
- Usa `toast.success()` da biblioteca `sonner` para notificações
- Exemplos: "Instância WhatsApp criada!", "WhatsApp conectado!", "Instância removida!"

**Erro:**
- Estado `error` é uma string ou null
- Quando não-null, renderiza um card vermelho com ícone `AlertCircle` e a mensagem

### Hook: `useWhatsApp`

**Arquivo:** `src/hooks/use-whatsapp.ts`

#### Interface de retorno

```typescript
interface UseWhatsAppReturn {
  instance: WhatsAppInstance | null;
  qrCode: string;
  loading: boolean;
  error: string | null;
  loadInstance: () => Promise<void>;
  fetchQrCode: () => Promise<void>;
  reconnect: () => Promise<void>;
  deleteInstance: () => Promise<void>;
}
```

#### Interface da instância

```typescript
export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_name: string;
  device_name: string;
  server_url: string;
  webhook_url: string | null;
  status: string;
  is_connected: boolean;
  last_connection_at: string | null;
  created_at: string;
  updated_at: string;
}
```

**Nota:** `instance_token` e `token` **não estão nesta interface** porque são removidos pelo backend antes de chegar ao frontend.

#### Wrapper `callManage`

```typescript
const callManage = useCallback(async (action: string) => {
  const { data, error: fnError } = await supabase.functions.invoke("whatsapp-manage", {
    body: { action },
  });
  if (fnError) {
    const message = typeof fnError.context === "string" && fnError.context
      ? fnError.context
      : fnError.message || "Erro na função";
    throw new Error(message);
  }
  return data;
}, []);
```

O `supabase.functions.invoke` adiciona automaticamente os headers `apikey` e `authorization` do client Supabase. A Edge Function não valida esses headers (single-tenant), mas eles são enviados pelo SDK.

#### Mecanismo de lock

```typescript
const lockRef = useRef(false);

const loadInstance = useCallback(async () => {
  if (lockRef.current) return; // evita chamadas duplicadas
  lockRef.current = true;
  // ...
  lockRef.current = false;
}, [callManage]);
```

O `lockRef` evita que o `useEffect` inicial chame `loadInstance()` mais de uma vez (React StrictMode em dev renderiza duas vezes).

---

## 8. Backend / Edge Functions / Supabase

### Edge Function: `whatsapp-manage`

| Item | Valor |
|------|-------|
| **Arquivo** | `supabase/functions/whatsapp-manage/index.ts` |
| **Responsabilidade** | Gerenciamento completo da instância WhatsApp |
| **Entrada** | `POST` com body `{ action: string }` |
| **Saída** | JSON com dados da instância ou resultado da ação |
| **Autenticação** | Nenhuma validação JWT (single-tenant) |
| **Chamadas externas** | Proxy de criação, API uazapi (connect, webhook, delete) |
| **Dependências de secrets** | `WHATSAPI_API_TOKEN`, `WHATSAPI_CREATE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Pode ser reaproveitada?** | Sim, com ajuste de `USER_ID` para multi-tenant |

#### Código completo

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPI_TOKEN = Deno.env.get("WHATSAPI_API_TOKEN")!;
const CREATE_URL = Deno.env.get("WHATSAPI_CREATE_URL")!;

const USER_ID = "admin"; // single-tenant, no auth

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    if (action === "get-or-create") return await handleGetOrCreate();
    else if (action === "qrcode") return await handleQrCode();
    else if (action === "disconnect") return await handleDisconnect();
    else if (action === "delete") return await handleDelete();
    else return json({ error: "Invalid action" }, 400);
  } catch (e) {
    console.error("whatsapp-manage error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

// ... funções detalhadas nas seções anteriores
```

#### Ações detalhadas

**`handleGetOrCreate()`**
1. Busca instância existente por `user_id = 'admin'`
2. Se existe → retorna sanitizada com `is_new: false`
3. Se não existe:
   a. Gera `instanceName = "locadora-{Date.now()}"`
   b. `POST {CREATE_URL}` com `{ token, name, deviceName }`
   c. Extrai `server_url`, `Instance Token`, `token` da resposta
   d. Registra webhook: `POST {server_url}/webhook`
   e. Insere no banco
   f. Retorna sanitizada com `is_new: true`

**`handleQrCode()`**
1. Busca instância por `user_id`
2. `POST {server_url}/instance/connect` com header `token: {instance_token}`
3. Interpreta resposta:
   - Verifica `qrJson.instance?.qrcode || qrJson.qrcode` para o QR Code
   - Verifica `qrJson.connected === true || qrJson.instance?.status === "connected"` para status
4. Se conectado → atualiza banco → retorna `{ connected: true }`
5. Se não → atualiza status para `connecting` → retorna QR Code

**`handleDisconnect()`**
1. `UPDATE whatsapp_instances SET status='disconnected', is_connected=false`
2. Retorna `{ success: true }`

**`handleDelete()`**
1. Busca `server_url` e `instance_token`
2. `DELETE {server_url}/instance` (resiliente a falhas)
3. `DELETE FROM whatsapp_instances WHERE user_id = 'admin'`
4. Retorna `{ deleted: true }`

**`sanitize(inst)`**
```typescript
function sanitize(inst: Record<string, unknown>) {
  const { instance_token, token, ...safe } = inst;
  return safe;
}
```
Remove `instance_token` e `token` para não expor ao frontend.

**`json(data, status)`**
```typescript
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### Edge Function: `whatsapp-webhook`

| Item | Valor |
|------|-------|
| **Arquivo** | `supabase/functions/whatsapp-webhook/index.ts` |
| **Responsabilidade** | Receber eventos push da API uazapi |
| **Entrada** | `POST` com `?user_id=admin` na query string, body JSON com evento |
| **Saída** | `{ ok: true }` |
| **Autenticação** | Nenhuma (chamado pela API externa) |
| **Chamadas externas** | Nenhuma |
| **Dependências de secrets** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Pode ser reaproveitada?** | Sim, sem alteração |

#### Código completo

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    console.log("Webhook received for user:", userId, "body:", JSON.stringify(body));

    const isConnected =
      body.event === "connection" ||
      body.status === "CONNECTED" ||
      body.connected === true;

    const isDisconnected =
      body.event === "disconnected" ||
      body.status === "DISCONNECTED" ||
      body.connected === false;

    if (isConnected) {
      await adminClient
        .from("whatsapp_instances")
        .update({
          status: "connected",
          is_connected: true,
          last_connection_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else if (isDisconnected) {
      await adminClient
        .from("whatsapp_instances")
        .update({
          status: "disconnected",
          is_connected: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
```

### Classificação das funções para replicação

| Função/Arquivo | Obrigatória | Depende de secrets | Pode reaproveitar sem alteração |
|----------------|-------------|-------------------|-------------------------------|
| `whatsapp-manage` | ✅ Sim | ✅ WHATSAPI_API_TOKEN, WHATSAPI_CREATE_URL | ⚠️ Ajustar `USER_ID` para multi-tenant |
| `whatsapp-webhook` | ✅ Sim | ✅ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | ✅ Sim |
| `use-whatsapp.ts` | ✅ Sim | ❌ Não | ✅ Sim |
| `WhatsAppConfig.tsx` | ✅ Sim | ❌ Não | ⚠️ Ajustar layout/design |
| `sanitize()` | ✅ Auxiliar (dentro da manage) | ❌ | ✅ Sim |

---

## 9. Webhook

### URL do webhook

```
https://umsyxiztgfiedtibxjeo.supabase.co/functions/v1/whatsapp-webhook?user_id=admin
```

**Formato:** `{SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id={USER_ID}`

### Onde é configurado

Na Edge Function `whatsapp-manage`, dentro de `handleGetOrCreate()`, imediatamente após criar a instância:

```typescript
const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=${USER_ID}`;

await fetch(`${serverUrl}/webhook`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    token: instanceToken,
  },
  body: JSON.stringify({
    url: webhookUrl,
    enabled: true,
    active: true,
    byApi: true,
    addUrlEvents: true,
    addUrlTypesMessages: true,
    excludeMessages: ["wasSentByApi", "isGroupYes"],
    events: [
      "connection", "messages", "messages_update", "presence",
      "call", "contacts", "groups", "labels", "chats",
      "chat_labels", "blocks", "leads", "history", "sender",
    ],
  }),
});
```

### Quando é ativado

O webhook é registrado **uma única vez**, no momento da criação da instância. A API uazapi passa a enviar eventos automaticamente para a URL configurada.

### Tipos de evento que recebe

A Edge Function `whatsapp-webhook` processa dois tipos de evento:

**Conexão:**
```json
{
  "event": "connection",
  "connected": true,
  "status": "CONNECTED"
}
```

Regra de detecção:
```typescript
const isConnected =
  body.event === "connection" ||
  body.status === "CONNECTED" ||
  body.connected === true;
```

**Desconexão:**
```json
{
  "event": "disconnected",
  "connected": false,
  "status": "DISCONNECTED"
}
```

Regra de detecção:
```typescript
const isDisconnected =
  body.event === "disconnected" ||
  body.status === "DISCONNECTED" ||
  body.connected === false;
```

### Como o sistema valida o webhook

**Não há validação de assinatura/HMAC.** O webhook é protegido apenas pela obscuridade da URL (ter `user_id` como parâmetro). Para produção, considere adicionar um token de verificação.

### Onde os dados recebidos são processados

Na tabela `whatsapp_instances`, atualizando os campos `status`, `is_connected`, `last_connection_at` e `updated_at`.

### Como responde para a API

Sempre retorna `{ "ok": true }` com status 200, independentemente do tipo de evento.

---

## 10. ENV e Configurações

### Lista completa de variáveis

| Variável | Onde é usada | Frontend/Backend | Obrigatória | Risco se exposta |
|----------|-------------|-----------------|-------------|-----------------|
| `WHATSAPI_API_TOKEN` | `whatsapp-manage` (body da criação) | Backend only | ✅ | 🔴 Alto — permite criar instâncias na sua conta |
| `WHATSAPI_CREATE_URL` | `whatsapp-manage` (URL do proxy) | Backend only | ✅ | 🟡 Médio — expõe URL do proxy |
| `WHATSAPI_PROXY_APIKEY` | **NÃO USADO** no código final | — | ❌ | — |
| `SUPABASE_URL` | Ambas Edge Functions + frontend | Ambos | ✅ | 🟢 Baixo — é público |
| `SUPABASE_SERVICE_ROLE_KEY` | Ambas Edge Functions | Backend only | ✅ | 🔴 Alto — acesso total ao banco |
| `SUPABASE_PUBLISHABLE_KEY` | Frontend (client.ts) | Frontend only | ✅ | 🟢 Baixo — é público |
| `VITE_SUPABASE_URL` | Frontend (.env) | Frontend only | ✅ | 🟢 Baixo |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend (.env) | Frontend only | ✅ | 🟢 Baixo |

### Como configurar em outro projeto

**No Supabase (Secrets da Edge Function):**
1. Vá em Settings → Edge Functions → Secrets
2. Adicione:
   - `WHATSAPI_API_TOKEN` = seu token da API WhatsApi/uazapi
   - `WHATSAPI_CREATE_URL` = URL do proxy de criação (ex: `https://seuproxy.supabase.co/functions/v1/create-instance-url`)
3. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são configurados automaticamente pelo Supabase

**No frontend (.env):**
```env
VITE_SUPABASE_URL="https://SEU_PROJETO.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
```

Estes são gerados automaticamente ao conectar o Supabase no Lovable.

---

## 11. Lógica de Reutilização da Instância

### Regra completa

```
1. Busca: SELECT * FROM whatsapp_instances WHERE user_id = 'admin' LIMIT 1
2. Se encontrou → retorna a instância existente (is_new: false)
3. Se NÃO encontrou → cria nova via proxy → salva no banco → retorna (is_new: true)
```

### Como evita duplicidade

- **`.maybeSingle()`**: O Supabase retorna `null` se não existe ou o único registro. Se houvesse mais de 1, retornaria erro.
- **`lockRef`**: No frontend, impede chamadas simultâneas de `loadInstance()`
- **Regra de 1 instância por user_id**: A lógica sempre busca primeiro. Só cria se não existe.

### Como trata instância inválida

- Se a instância existe no banco mas foi deletada da API uazapi manualmente, ela continua no banco como "connected" ou "disconnected". O usuário pode:
  1. Clicar "Remover Instância" para limpar
  2. A API pode enviar webhook de desconexão, atualizando o status

- **Não há verificação automática de validade** da instância na API. O polling verifica apenas o status no banco (que é atualizado via webhook ou via resposta do `/instance/connect`).

### Como recupera falhas de sincronização

- Se o banco diz `is_connected: false` mas a API diz que está conectado: ao buscar QR Code, a função `handleQrCode` detecta `connected: true` na resposta e atualiza o banco automaticamente.
- Se o banco diz `is_connected: true` mas a API desconectou: o webhook atualiza automaticamente. Se o webhook falhar, o status fica desatualizado até que o usuário tente reconectar.

---

## 12. Erros e Correções Importantes

### Problema 1: Erro 405 Method Not Allowed ao criar instância

**Sintoma:** Edge Function retornava `500: Error, {"error":"Falha ao criar instância: 405"}`

**Causa raiz:** O secret `WHATSAPI_CREATE_URL` estava configurado com a URL do servidor uazapi (`https://ipazua.uazapi.com`) ao invés da URL do proxy de criação (`https://grlwciflaotripbumhve.supabase.co/functions/v1/create-instance-url`). O servidor uazapi não aceita POST direto na raiz.

**Correção:** Atualizar o secret `WHATSAPI_CREATE_URL` para a URL correta do proxy.

**Como evitar:** Documentar claramente que `WHATSAPI_CREATE_URL` deve ser a URL do **proxy**, não do servidor uazapi.

### Problema 2: Erro 405 por headers extras no proxy

**Sintoma:** Mesmo com a URL correta, o proxy rejeitava a requisição com 405.

**Causa raiz:** O código enviava headers extras como `apikey`, `Authorization`, e `x-api-key` que o proxy (outra Edge Function Supabase) não aceitava/esperava. O proxy espera apenas `Content-Type: application/json`.

**Correção:** Remover todos os headers extras. Enviar apenas:
```typescript
headers: { "Content-Type": "application/json" }
```

**Como evitar:** Ao usar um proxy, enviar **apenas** os headers documentados. Nunca adicionar headers de autenticação a menos que explicitamente necessário.

### Problema 3: Fallback desnecessário complicando o código

**Sintoma:** O código tinha múltiplas tentativas com diferentes combinações de headers e URLs, tornando difícil debugar.

**Causa raiz:** Tentativas anteriores de resolver o problema adicionaram lógica de retry/fallback que mascarava o erro real.

**Correção:** Simplificar para uma única chamada `fetch` direta, sem fallbacks.

**Como evitar:** Primeiro fazer funcionar o caso simples. Só adicionar retry/fallback quando o caso simples estiver funcionando.

### Problema 4: Campo "Instance Token" com espaço no nome

**Sintoma:** O `instance_token` retornado pelo proxy vinha no campo `"Instance Token"` (com espaço), não `"instance_token"`.

**Causa raiz:** A API do proxy usa o nome com espaço como chave JSON.

**Correção:**
```typescript
const instanceToken = (createJson["Instance Token"] || createJson.instance_token) as string;
```

**Como evitar:** Sempre verificar a resposta real da API e tratar variações de nomes de campos.

---

## 13. Passo a Passo para Replicar em Outro Projeto

### Pré-requisitos

- Projeto React + Vite + TypeScript configurado
- Supabase configurado (externo ou Lovable Cloud)
- Conta na API WhatsApi/uazapi com token válido
- Proxy de criação de instância (Edge Function separada que cria instâncias na uazapi)

### Passo 1: Criar tabela no banco

Execute no SQL Editor do Supabase:

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

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Para single-tenant sem auth:
CREATE POLICY "Allow all" ON public.whatsapp_instances
  FOR ALL TO public USING (true) WITH CHECK (true);
```

### Passo 2: Configurar secrets

No painel do Supabase → Settings → Edge Functions → Secrets:

1. `WHATSAPI_API_TOKEN` = seu token da API (ex: `mvYUQdH9gbfHQM8ozQZ8MGau5dDSTQ2pFW8a`)
2. `WHATSAPI_CREATE_URL` = URL do proxy de criação (ex: `https://seuproxy.supabase.co/functions/v1/create-instance-url`)

**⚠️ ATENÇÃO:** `WHATSAPI_CREATE_URL` deve ser a URL do PROXY, não do servidor uazapi!

### Passo 3: Criar Edge Function `whatsapp-manage`

Crie o arquivo `supabase/functions/whatsapp-manage/index.ts` com o código completo da seção 8.

**Pontos de atenção:**
- O import de CORS: `import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";`
- A chamada ao proxy usa **apenas** `Content-Type: application/json` como header
- O token da API vai no **body**, não no header
- `"Instance Token"` (com espaço) é a chave real da resposta do proxy

### Passo 4: Criar Edge Function `whatsapp-webhook`

Crie o arquivo `supabase/functions/whatsapp-webhook/index.ts` com o código completo da seção 8.

**Pontos de atenção:**
- Não precisa de CORS (chamado server-to-server pela API uazapi)
- Não valida JWT/auth (é um webhook público)
- `user_id` vem da query string, não do body

### Passo 5: Criar Hook `use-whatsapp.ts`

Crie `src/hooks/use-whatsapp.ts` com o código completo mostrado no projeto.

**Pontos de atenção:**
- Importar `supabase` do client correto: `import { supabase } from "@/integrations/supabase/client";`
- O `lockRef` é essencial para evitar chamadas duplicadas no React StrictMode
- O polling para quando `is_connected === true`

### Passo 6: Criar página `WhatsAppConfig.tsx`

Crie `src/pages/WhatsAppConfig.tsx` com o código completo mostrado no projeto.

Adapte o layout (`AdminLayout`) para o layout do seu projeto.

### Passo 7: Adicionar rota

No `App.tsx`:
```tsx
import WhatsAppConfig from "@/pages/WhatsAppConfig";

// Dentro das rotas:
<Route path="/whatsapp" element={<WhatsAppConfig />} />
```

### Passo 8: Deploy e testar

1. **Faça deploy das Edge Functions** (automático no Lovable, manual via `supabase functions deploy` em outros ambientes)
2. **Acesse `/whatsapp`** no frontend
3. **Observe os logs** da Edge Function no painel Supabase
4. **Verifique se a instância foi criada** (logs devem mostrar "Creating instance...")
5. **Verifique se o QR Code apareceu** na tela
6. **Escaneie o QR Code** com o celular
7. **Aguarde o polling** detectar a conexão (até 15s)
8. **Verifique os logs do webhook** para confirmar que o evento de conexão chegou

### Passo 9: Testar desconexão

1. Clique em "Reconectar"
2. Verifique que o status muda para "desconectado"
3. Verifique que novo QR Code é gerado

### Passo 10: Testar exclusão

1. Clique em "Remover Instância"
2. Verifique que a instância sumiu do banco
3. Verifique nos logs que a API uazapi foi chamada para deletar

### Passo 11: Validar segurança

1. Verifique que `instance_token` e `token` **nunca** aparecem no Network do browser
2. Verifique que a resposta da Edge Function tem apenas os campos sanitizados
3. Verifique que o RLS está habilitado na tabela

### Passo 12: (Opcional) Implementar envio de mensagens

Crie uma nova Edge Function ou ação no `whatsapp-manage`:

```typescript
// action: "send-message"
async function handleSendMessage(phone: string, message: string) {
  const { data: inst } = await adminClient
    .from("whatsapp_instances")
    .select("server_url, instance_token")
    .eq("user_id", USER_ID)
    .single();

  const res = await fetch(`${inst.server_url}/message/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: inst.instance_token,
    },
    body: JSON.stringify({
      phone: phone, // formato: "5511999991111"
      message: message,
    }),
  });

  return await res.json();
}
```

---

## 14. Checklist Final

### Banco de dados
- [ ] Tabela `whatsapp_instances` criada com 13 colunas
- [ ] RLS habilitado na tabela
- [ ] Policy criada (permissiva para single-tenant, ou baseada em `auth.uid()` para multi-tenant)

### Secrets
- [ ] `WHATSAPI_API_TOKEN` configurado com token válido da API
- [ ] `WHATSAPI_CREATE_URL` configurado com URL do **PROXY** (não do servidor uazapi!)
- [ ] `SUPABASE_URL` configurado (geralmente automático)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado (geralmente automático)

### Edge Functions
- [ ] `whatsapp-manage/index.ts` criada e deployada
- [ ] `whatsapp-webhook/index.ts` criada e deployada
- [ ] Ambas retornam CORS headers corretamente
- [ ] `whatsapp-manage` usa apenas `Content-Type: application/json` no fetch para o proxy (sem headers extras!)
- [ ] `whatsapp-webhook` aceita POST sem autenticação

### Frontend
- [ ] Hook `use-whatsapp.ts` criado com `callManage`, `loadInstance`, `fetchQrCode`, `reconnect`, `deleteInstance`
- [ ] Polling de 15s implementado com cleanup no `useEffect`
- [ ] `lockRef` para evitar chamadas duplicadas
- [ ] Página `WhatsAppConfig.tsx` criada com todos os estados visuais
- [ ] Rota `/whatsapp` registrada no `App.tsx`
- [ ] QR Code exibido como `<img src={base64}>` (sem `dangerouslySetInnerHTML`)

### Webhook
- [ ] URL do webhook registrada automaticamente na criação da instância
- [ ] Formato: `{SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id={USER_ID}`
- [ ] Edge Function processa eventos de conexão e desconexão
- [ ] Atualiza `is_connected`, `status`, `last_connection_at` no banco

### Segurança
- [ ] `instance_token` e `token` removidos por `sanitize()` antes de retornar ao frontend
- [ ] Tokens nunca aparecem no Network do browser
- [ ] Service role key usada apenas no backend
- [ ] Frontend usa apenas `anon key` (via SDK)

### Testes
- [ ] Criar instância funciona (verificar logs)
- [ ] QR Code aparece na tela
- [ ] Escanear QR conecta a instância
- [ ] Polling detecta conexão em até 15s
- [ ] Webhook atualiza status corretamente
- [ ] Reconectar funciona
- [ ] Remover instância funciona
- [ ] Criar nova instância após remover funciona
- [ ] Erros são exibidos corretamente na interface

---

## Notas Finais

### Limitações conhecidas

1. **Sem envio de mensagens:** A infraestrutura está pronta mas o frontend de envio não foi implementado
2. **Sem validação de webhook:** Qualquer um que conheça a URL pode enviar eventos falsos
3. **Sem multi-tenant:** `user_id` é fixo como `'admin'`
4. **Sem verificação de validade:** Não verifica se a instância ainda existe na API uazapi
5. **Tabela `whatsapp_config` não usada:** Existe no banco mas não é utilizada pela integração

### Para migrar para multi-tenant

1. Implementar autenticação (Supabase Auth)
2. Trocar `USER_ID = "admin"` por `auth.uid()` extraído do JWT
3. Atualizar RLS policies para `user_id = auth.uid()`
4. Na Edge Function, validar o JWT e extrair o `user_id` do token

---

> **Documento gerado em:** 31/03/2026  
> **Baseado no código real do projeto:** LocadoraCRM  
> **Supabase Project Ref:** umsyxiztgfiedtibxjeo  
