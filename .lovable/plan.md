

## Corrigir lógica do carrossel no webhook

### Problema
O motor de fluxo (webhook) ignora os veículos selecionados manualmente no painel de configuração. Em vez de usar `config.vehicles` (os veículos escolhidos pelo usuário), ele faz uma query no banco buscando todos os veículos disponíveis. Isso quebra o roteamento por handle — quando o cliente escolhe o HD20, o sistema não consegue mapear corretamente para o nó de mensagem conectado àquela saída.

### Alteração

#### `supabase/functions/whatsapp-webhook/index.ts` (linhas 506-544)
Reescrever o bloco `vehicle_carousel` para:

1. **Usar `cfg.vehicles`** (os veículos selecionados no painel) em vez de fazer query no banco
2. Para cada veículo do config, buscar os dados completos do banco (`name, brand, model, year, color, daily_rate, weekly_rate, monthly_rate, images`) usando os IDs salvos
3. Montar o carrossel apenas com esses veículos, na mesma ordem do config
4. O botão de cada veículo continua com `id: veiculo_${v.id}` — isso já funciona no handler de resposta (linhas 1366-1398)
5. Remover o filtro por categoria e o `maxCards` da query, já que o usuário escolheu manualmente

### Resultado
Quando o cliente seleciona o HD20 no WhatsApp, o webhook encontra o índice desse veículo no `config.vehicles`, usa o handle `vehicle-0`, `vehicle-1`, etc., e segue para o nó de mensagem conectado àquela saída específica.

