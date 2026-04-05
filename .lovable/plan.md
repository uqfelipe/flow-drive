
Objetivo: fazer o envio de lembretes rodar em background de verdade, mesmo sem usuário logado e sem a página aberta.

### Diagnóstico
O que existe hoje é apenas um fallback no frontend:
- `src/pages/Reminders.tsx` chama `send-reminders` em loop quando a tela está aberta
- a função `supabase/functions/send-reminders/index.ts` já sabe processar lembretes vencidos
- não encontrei nenhum agendamento backend (`cron.schedule`) no projeto

Por isso, hoje o envio só acontece se alguém estiver com o app aberto.

### Estratégia correta
Mover a automação real para o backend com duas camadas:

1. Backend principal:
- criar um job `pg_cron` no Supabase para chamar a Edge Function `send-reminders` a cada minuto
- isso garante envio automático mesmo sem acesso ao site

2. Frontend como fallback opcional:
- manter o toggle atual da página de lembretes como reforço quando alguém estiver usando o sistema
- mas deixar claro no texto da UI que o envio automático principal agora vem do servidor

### O que vou ajustar
#### 1) Configuração do agendamento no Supabase
Criar/validar o job:
- frequência: a cada 1 minuto
- chamada HTTP para `https://umsyxiztgfiedtibxjeo.supabase.co/functions/v1/send-reminders`
- header com `Authorization: Bearer <SUPABASE_ANON_KEY>`

Também vou planejar proteção para evitar job duplicado:
- usar nome fixo para o cron
- remover/recriar se já existir, ou validar antes de criar

#### 2) Melhorar a Edge Function
Em `supabase/functions/send-reminders/index.ts`:
- validar melhor o retorno quando não houver instância WhatsApp
- manter resposta consistente para cron e frontend
- opcionalmente adicionar logs mais claros para:
  - lembrete encontrado
  - sem lembretes pendentes
  - envio com sucesso
  - falha por cliente sem telefone
  - falha da API do WhatsApp

Isso ajuda a monitorar no log quando o cron estiver rodando sozinho.

#### 3) Ajustar a tela de lembretes
Em `src/pages/Reminders.tsx`:
- atualizar o texto do toggle atual para deixar claro que ele é um “reforço com a tela aberta”
- exemplo de ideia:
  - “Processamento local com a tela aberta”
  - ou “Reforço automático no navegador”
- manter ou simplificar os indicadores visuais atuais

Assim evitamos a expectativa errada de que esse switch sozinho faz processamento em background sem servidor.

### Resultado esperado
Depois disso:
- se ninguém estiver logado, o Supabase ainda chamará `send-reminders` sozinho
- o lembrete será enviado automaticamente quando vencer, sem depender da página `/reminders`
- o frontend continuará apenas como camada extra, não como mecanismo principal

### Arquivos/áreas envolvidos
- `supabase/functions/send-reminders/index.ts`
- configuração SQL do `pg_cron` no Supabase
- `src/pages/Reminders.tsx` (ajuste de texto/comunicação da UI)

### Detalhes técnicos
```text
Cenário atual
Página aberta -> frontend chama Edge Function -> envia
Página fechada -> nada chama a Edge Function -> não envia

Cenário corrigido
pg_cron -> chama send-reminders a cada minuto -> envia em background
Página aberta -> pode continuar como fallback extra
```

Observações:
- com `pg_cron`, o envio não será “no segundo exato”; o normal é ocorrer em até ~59 segundos após o horário agendado
- para produção, essa é a arquitetura certa; polling no frontend sozinho nunca resolve o caso de usuário offline
