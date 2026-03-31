import type { FlowNodeCategory } from "@/types";
import {
  MessageSquare,
  Zap,
  GitBranch,
  Keyboard,
  Database,
  Clock,
  Sparkles,
  Send,
  ListChecks,
  CheckCircle2,
  FileText,
  Bell,
  SplitSquareHorizontal,
  ToggleLeft,
  Type,
  Activity,
  CalendarDays,
  DollarSign,
  Search,
  UserCheck,
  UserPlus,
  Car,
  CalendarPlus,
  CalendarClock,
  CreditCard,
  Save,
  Timer,
  MessageCircle,
  Users,
  XCircle,
  RefreshCw,
  Brain,
  Target,
  Lightbulb,
  Phone,
  Hash,
  Calendar,
  ClipboardList,
} from "lucide-react";

export interface NodeTypeConfig {
  type: string;
  label: string;
  category: FlowNodeCategory;
  icon: any;
  description: string;
  color: string;
  defaultConfig?: Record<string, any>;
}

export const nodeCategories: { category: FlowNodeCategory; label: string; color: string; icon: any }[] = [
  { category: "trigger", label: "Gatilhos", color: "text-node-trigger", icon: Zap },
  { category: "message", label: "Mensagens", color: "text-node-message", icon: Send },
  { category: "logic", label: "Lógica", color: "text-node-logic", icon: GitBranch },
  { category: "input", label: "Entrada de Dados", color: "text-node-input", icon: Keyboard },
  { category: "database", label: "Banco de Dados", color: "text-node-database", icon: Database },
  { category: "automation", label: "Automação", color: "text-node-automation", icon: Clock },
  { category: "ai", label: "Inteligência Artificial", color: "text-node-ai", icon: Sparkles },
];

export const nodeTypes: NodeTypeConfig[] = [
  // Triggers
  { type: "message_received", label: "Mensagem Recebida", category: "trigger", icon: MessageSquare, description: "Inicia quando uma mensagem é recebida", color: "node-trigger" },
  { type: "new_customer", label: "Novo Cliente", category: "trigger", icon: UserPlus, description: "Inicia quando um novo cliente entra em contato", color: "node-trigger" },
  { type: "payment_due", label: "Pagamento Próximo", category: "trigger", icon: Bell, description: "Dispara quando um pagamento está próximo do vencimento", color: "node-trigger" },
  { type: "payment_overdue", label: "Pagamento Vencido", category: "trigger", icon: DollarSign, description: "Dispara quando um pagamento está vencido", color: "node-trigger" },
  { type: "return_due", label: "Devolução Próxima", category: "trigger", icon: CalendarClock, description: "Dispara quando uma devolução está próxima", color: "node-trigger" },
  { type: "scheduled", label: "Horário Agendado", category: "trigger", icon: Clock, description: "Dispara em horário pré-definido", color: "node-trigger" },
  { type: "webhook", label: "Webhook Recebido", category: "trigger", icon: Zap, description: "Dispara quando um webhook é recebido", color: "node-trigger" },

  // Messages
  { type: "send_text", label: "Enviar Texto", category: "message", icon: Send, description: "Envia uma mensagem de texto", color: "node-message", defaultConfig: { message: "" } },
  { type: "send_options", label: "Enviar Opções", category: "message", icon: ListChecks, description: "Envia uma lista de opções para o cliente", color: "node-message", defaultConfig: { options: [] } },
  { type: "send_confirmation", label: "Enviar Confirmação", category: "message", icon: CheckCircle2, description: "Envia mensagem de confirmação", color: "node-message" },
  { type: "send_summary", label: "Resumo da Reserva", category: "message", icon: FileText, description: "Envia resumo detalhado da reserva", color: "node-message" },
  { type: "send_reminder", label: "Lembrete de Pagamento", category: "message", icon: Bell, description: "Envia lembrete de pagamento", color: "node-message" },

  // Logic
  { type: "if_else", label: "Se / Senão", category: "logic", icon: GitBranch, description: "Condição com duas saídas", color: "node-logic", defaultConfig: { condition: "" } },
  { type: "switch", label: "Switch", category: "logic", icon: SplitSquareHorizontal, description: "Múltiplas condições", color: "node-logic" },
  { type: "condition_text", label: "Condição por Texto", category: "logic", icon: Type, description: "Verifica texto da mensagem", color: "node-logic" },
  { type: "condition_status", label: "Condição por Status", category: "logic", icon: ToggleLeft, description: "Verifica status de um registro", color: "node-logic" },
  { type: "condition_date", label: "Condição por Data", category: "logic", icon: CalendarDays, description: "Verifica condição de data", color: "node-logic" },
  { type: "condition_payment", label: "Condição por Pagamento", category: "logic", icon: DollarSign, description: "Verifica status de pagamento", color: "node-logic" },
  { type: "check_availability", label: "Verificar Disponibilidade", category: "logic", icon: Search, description: "Verifica se veículo está disponível", color: "node-logic" },
  { type: "check_customer", label: "Verificar Cliente", category: "logic", icon: UserCheck, description: "Verifica se cliente já existe", color: "node-logic" },

  // Input
  { type: "capture_name", label: "Capturar Nome", category: "input", icon: Type, description: "Solicita e captura o nome", color: "node-input" },
  { type: "capture_cpf", label: "Capturar CPF", category: "input", icon: Hash, description: "Solicita e valida CPF", color: "node-input" },
  { type: "capture_phone", label: "Capturar Telefone", category: "input", icon: Phone, description: "Solicita telefone", color: "node-input" },
  { type: "capture_date", label: "Capturar Data", category: "input", icon: Calendar, description: "Solicita uma data", color: "node-input" },
  { type: "capture_period", label: "Capturar Período", category: "input", icon: CalendarDays, description: "Solicita período de locação", color: "node-input" },
  { type: "capture_vehicle", label: "Escolha de Veículo", category: "input", icon: Car, description: "Solicita escolha de veículo", color: "node-input" },

  // Database
  { type: "search_vehicles", label: "Buscar Veículos", category: "database", icon: Car, description: "Busca veículos disponíveis", color: "node-database" },
  { type: "search_customer", label: "Buscar Cliente", category: "database", icon: Search, description: "Busca cliente no banco", color: "node-database" },
  { type: "create_customer", label: "Criar Cliente", category: "database", icon: UserPlus, description: "Cadastra novo cliente", color: "node-database" },
  { type: "create_rental", label: "Criar Reserva", category: "database", icon: CalendarPlus, description: "Cria uma nova reserva", color: "node-database" },
  { type: "update_rental", label: "Atualizar Reserva", category: "database", icon: RefreshCw, description: "Atualiza dados da reserva", color: "node-database" },
  { type: "register_payment", label: "Registrar Pagamento", category: "database", icon: CreditCard, description: "Registra um pagamento", color: "node-database" },
  { type: "save_history", label: "Salvar Histórico", category: "database", icon: Save, description: "Salva histórico da conversa", color: "node-database" },

  // Automation
  { type: "delay", label: "Delay", category: "automation", icon: Timer, description: "Aguarda um tempo definido", color: "node-automation", defaultConfig: { seconds: 5 } },
  { type: "wait_response", label: "Aguardar Resposta", category: "automation", icon: MessageCircle, description: "Pausa e aguarda resposta do cliente", color: "node-automation" },
  { type: "schedule_reminder", label: "Agendar Lembrete", category: "automation", icon: Bell, description: "Agenda um lembrete futuro", color: "node-automation" },
  { type: "transfer_human", label: "Transferir p/ Humano", category: "automation", icon: Users, description: "Transfere para atendente humano", color: "node-automation" },
  { type: "end_session", label: "Encerrar Atendimento", category: "automation", icon: XCircle, description: "Finaliza a sessão do chatbot", color: "node-automation" },
  { type: "update_status", label: "Atualizar Status", category: "automation", icon: RefreshCw, description: "Atualiza status do veículo", color: "node-automation" },

  // AI
  { type: "interpret_message", label: "Interpretar Mensagem", category: "ai", icon: Brain, description: "Usa IA para interpretar a mensagem", color: "node-ai" },
  { type: "classify_intent", label: "Classificar Intenção", category: "ai", icon: Target, description: "Classifica a intenção do cliente", color: "node-ai" },
  { type: "natural_response", label: "Resposta Natural", category: "ai", icon: MessageSquare, description: "Gera resposta com linguagem natural", color: "node-ai" },
  { type: "suggest_next", label: "Sugerir Próximo Passo", category: "ai", icon: Lightbulb, description: "Sugere próximo passo ao operador", color: "node-ai" },
];

export function getNodeTypeConfig(type: string): NodeTypeConfig | undefined {
  return nodeTypes.find((n) => n.type === type);
}

export function getNodesByCategory(category: FlowNodeCategory): NodeTypeConfig[] {
  return nodeTypes.filter((n) => n.category === category);
}
