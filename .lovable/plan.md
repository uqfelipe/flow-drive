

# Sistema de Gestão para Locadora de Veículos com Construtor de Fluxos de Chatbot

## Visão Geral
Sistema completo para locadora de veículos com painel administrativo profissional e um **construtor visual de fluxos de chatbot** estilo n8n, onde o lojista monta a jornada do cliente no WhatsApp sem programar. O cliente interage exclusivamente via WhatsApp.

---

## Fase 1 — Fundação (Banco de Dados + Auth + Layout)

### Banco de dados no Supabase
Criar todas as tabelas com RLS:
- **vehicles** — nome, marca, modelo, ano, placa, cor, categoria, diária, semanal, mensal, descrição, status (disponível/reservado/alugado/manutenção/inativo)
- **vehicle_images** — fotos dos veículos
- **customers** — nome, telefone, CPF, observações, status
- **rentals** — veículo, cliente, datas retirada/devolução, valor, status locação, status pagamento, origem (manual/chatbot)
- **rental_payments** — valor, vencimento, status, data pagamento
- **chatbot_flows** — nome, descrição, status (ativo/inativo), versão, dados do fluxo (nodes/edges em JSON)
- **chatbot_sessions** — sessão do cliente, fluxo atual, nó atual, variáveis, status
- **chatbot_messages** — histórico de mensagens (entrada/saída)
- **chatbot_executions** — log de execução de cada fluxo
- **whatsapp_instances** — configuração da instância WhatsApp
- **notifications** — alertas do sistema
- **user_roles** — roles separadas (conforme regra de segurança)

### Autenticação
- Login com email/senha via Supabase Auth
- Proteção de rotas no frontend
- RLS em todas as tabelas

### Layout do painel
- Sidebar com navegação (Dashboard, Veículos, Clientes, Reservas, Financeiro, Conversas, Construtor de Fluxos, Configurações)
- Header com info do usuário
- Design moderno e premium estilo SaaS, tema escuro/claro

---

## Fase 2 — Painel Administrativo

### Dashboard
- Cards com totais: veículos, disponíveis, alugados, reservas ativas, pagamentos pendentes, vencidos
- Alertas importantes (devoluções próximas, pagamentos vencidos)
- Gráficos resumidos

### Gestão de Veículos
- CRUD completo com upload de fotos
- Filtros por status, categoria, marca
- Visualização em cards com foto e detalhes
- Alteração de status (disponível, manutenção, inativo, etc.)

### Gestão de Clientes
- Lista com busca e filtros
- Cadastro manual + cadastro automático pelo bot
- Histórico de locações por cliente

### Reservas / Locações
- Criar reserva manual ou visualizar reservas do chatbot
- Aprovar/recusar reservas
- Calcular valor automático (diária × dias, ou semanal/mensal)
- Status: pendente, aprovada, ativa, concluída, cancelada
- Status pagamento: pendente, pago, vencido

### Financeiro
- Lista de pagamentos com filtros (pendente, pago, vencido)
- Destaque para vencimentos próximos
- Indicadores financeiros

### Histórico de Conversas
- Visualizar conversas por cliente
- Ver mensagens do bot e do cliente
- Identificar qual fluxo foi executado
- Logs detalhados de cada etapa

---

## Fase 3 — Construtor Visual de Fluxos (Destaque do Sistema)

### Editor visual usando React Flow
- Canvas grande com zoom e pan
- Painel lateral esquerdo com categorias de blocos arrastáveis
- Painel lateral direito para configurar o bloco selecionado
- Conexões entre nós com linhas animadas
- Interface drag & drop intuitiva e bonita

### Categorias de blocos disponíveis:

**Gatilhos (verde):** Mensagem recebida, Novo cliente, Nova reserva, Pagamento próximo do vencimento, Pagamento vencido, Devolução próxima, Horário agendado, Webhook recebido

**Mensagens (azul):** Enviar texto, Enviar lista de opções, Enviar confirmação, Enviar resumo da reserva, Enviar lembrete de pagamento

**Lógica (amarelo):** If/Else, Switch, Condição por texto/status/data/pagamento, Verificar disponibilidade, Verificar se cliente existe

**Entrada de dados (roxo):** Capturar nome, CPF, telefone, data, período, escolha de veículo

**Banco de dados (laranja):** Buscar veículos, Buscar/Criar cliente, Criar/Atualizar reserva, Registrar pagamento, Salvar histórico

**Automação (vermelho):** Delay, Aguardar resposta, Agendar lembrete, Transferir para humano, Encerrar atendimento, Atualizar status

**IA (gradiente):** Interpretar mensagem, Classificar intenção, Responder com linguagem natural

### Funcionalidades do editor:
- Criar, editar, duplicar, ativar/desativar fluxos
- Salvar automaticamente
- Botão "Testar fluxo" com simulação
- Botão "Publicar fluxo"
- Visualizar histórico de execuções com logs por etapa
- Suporte a variáveis dinâmicas (ex: {{cliente.nome}}, {{veiculo.modelo}})

### Fluxos pré-prontos (templates):
1. Atendimento inicial — boas-vindas + menu principal
2. Mostrar carros disponíveis — busca + envio de catálogo
3. Reserva de veículo — coleta de dados + cálculo + confirmação
4. Cobrança antes do vencimento — lembrete automático
5. Cobrança após vencimento — aviso de atraso
6. Transferir para humano — redirecionar conversa

---

## Fase 4 — Motor de Execução de Fluxos + WhatsApp

### Motor de fluxos (Edge Functions)
- Receber mensagem via webhook do WhatsApp
- Identificar sessão do cliente
- Determinar o nó atual no fluxo
- Executar a lógica do nó (condição, busca, coleta, mensagem)
- Avançar para o próximo nó
- Registrar cada passo nos logs de execução
- Suporte a espera por resposta do cliente

### Integração WhatsApp
- Tela de configuração da instância (URL base, token, webhook)
- Conexão via QR Code (se suportado pela API)
- Enviar e receber mensagens
- Processar mensagens recebidas pelo motor de fluxos
- Enviar lembretes automáticos (pagamento, devolução)

---

## Design & UX
- Visual premium, limpo e moderno estilo SaaS
- Paleta de cores profissional com tema escuro
- O editor de fluxos será o ponto alto visual — cores por categoria de bloco, animações suaves, layout intuitivo
- Responsivo para o painel admin (desktop-first)
- Ícones com Lucide React
- Componentes shadcn/ui

