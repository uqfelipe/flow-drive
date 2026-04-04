

## Mensagem de boas-vindas para primeiro contato

### Objetivo
Criar um sistema de mensagem de boas-vindas (texto ou áudio) que é enviada **apenas na primeira vez** que o usuário entra em contato. Após isso, nunca mais aparece.

### Como funciona

1. **Banco de dados** — Adicionar coluna `welcomed` (boolean, default false) na tabela `customers` para rastrear quem já recebeu a mensagem de boas-vindas.

2. **Configuração** — Adicionar registros na tabela `settings` para o admin configurar:
   - `welcome_type`: `"text"` ou `"audio"`
   - `welcome_text`: conteúdo da mensagem de texto
   - `welcome_audio_url`: URL do áudio de boas-vindas
   - `welcome_enabled`: ativar/desativar

3. **Página de Configurações** (`src/pages/SettingsPage.tsx`) — Adicionar seção "Mensagem de Boas-Vindas" com:
   - Toggle ativar/desativar
   - Seletor tipo: Texto ou Áudio
   - Campo de texto para mensagem
   - Campo de URL para áudio
   - Botão salvar

4. **Webhook** (`supabase/functions/whatsapp-webhook/index.ts`) — Na função `processIncomingMessage`, ao criar um novo customer ou detectar `welcomed = false`:
   - Buscar configurações de welcome da tabela `settings`
   - Se habilitado e `welcomed === false`: enviar texto ou áudio conforme configurado
   - Marcar `welcomed = true` no customer
   - Continuar o fluxo normal (perguntar nome, etc.)

### Fluxo do usuário
```text
Usuário manda "oi" (primeiro contato)
  → Bot envia mensagem/áudio de boas-vindas
  → Bot pergunta o nome
  → Fluxo normal continua

Usuário manda "oi" (segundo contato em diante)
  → Pula direto para o fluxo (sem boas-vindas)
```

### Arquivos alterados
- **Migração SQL** — `ALTER TABLE customers ADD COLUMN welcomed boolean DEFAULT false`
- **`src/pages/SettingsPage.tsx`** — Seção de configuração da mensagem de boas-vindas
- **`supabase/functions/whatsapp-webhook/index.ts`** — Lógica de envio condicional antes do fluxo

