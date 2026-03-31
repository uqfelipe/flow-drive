import type { FlowNodeCategory } from "@/types";
import {
  MessageSquare,
  Type,
  Image,
  Video,
  Code,
  TextCursorInput,
  Hash,
  Mail,
  Globe,
  Calendar,
  Phone,
  MousePointerClick,
  CreditCard,
  Star,
  Upload,
  GitBranch,
  Variable,
  ExternalLink,
  Bot,
  Database,
  Webhook,
  Sparkles,
  Brain,
  Send,
  Car,
  Search,
  UserPlus,
  CalendarPlus,
  RefreshCw,
  Save,
  Timer,
  Users,
  XCircle,
  Bell,
  Zap,
  Target,
  Lightbulb,
  Clock,
  ListChecks,
  CheckCircle2,
  FileText,
  DollarSign,
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
  { category: "bubble", label: "Bubbles", color: "text-blue-500", icon: MessageSquare },
  { category: "input", label: "Inputs", color: "text-orange-500", icon: TextCursorInput },
  { category: "logic", label: "Lógica", color: "text-purple-500", icon: GitBranch },
  { category: "integration", label: "Integrações", color: "text-emerald-500", icon: Database },
];

export const nodeTypes: NodeTypeConfig[] = [
  // Bubbles
  { type: "send_text", label: "Texto", category: "bubble", icon: Type, description: "Envia uma mensagem de texto", color: "blue", defaultConfig: { message: "" } },
  { type: "send_image", label: "Imagem", category: "bubble", icon: Image, description: "Envia uma imagem", color: "blue" },
  { type: "send_video", label: "Vídeo", category: "bubble", icon: Video, description: "Envia um vídeo", color: "blue" },
  { type: "send_options", label: "Opções", category: "bubble", icon: ListChecks, description: "Envia lista de opções", color: "blue", defaultConfig: { options: [] } },
  { type: "send_confirmation", label: "Confirmação", category: "bubble", icon: CheckCircle2, description: "Envia confirmação", color: "blue" },
  { type: "send_summary", label: "Resumo", category: "bubble", icon: FileText, description: "Resumo da reserva", color: "blue" },
  { type: "embed", label: "Embed", category: "bubble", icon: Code, description: "Conteúdo embed", color: "blue" },

  // Inputs
  { type: "capture_text", label: "Texto", category: "input", icon: TextCursorInput, description: "Captura texto livre", color: "orange" },
  { type: "capture_number", label: "Número", category: "input", icon: Hash, description: "Captura um número", color: "orange" },
  { type: "capture_email", label: "Email", category: "input", icon: Mail, description: "Captura email", color: "orange" },
  { type: "capture_website", label: "Website", category: "input", icon: Globe, description: "Captura URL", color: "orange" },
  { type: "capture_date", label: "Data", category: "input", icon: Calendar, description: "Captura uma data", color: "orange" },
  { type: "capture_phone", label: "Telefone", category: "input", icon: Phone, description: "Captura telefone", color: "orange" },
  { type: "capture_name", label: "Nome", category: "input", icon: Type, description: "Captura o nome", color: "orange" },
  { type: "capture_cpf", label: "CPF", category: "input", icon: Hash, description: "Captura e valida CPF", color: "orange" },
  { type: "capture_vehicle", label: "Veículo", category: "input", icon: Car, description: "Escolha de veículo", color: "orange" },
  { type: "button_input", label: "Botões", category: "input", icon: MousePointerClick, description: "Entrada por botões", color: "orange" },
  { type: "payment_input", label: "Pagamento", category: "input", icon: CreditCard, description: "Entrada de pagamento", color: "orange" },
  { type: "rating_input", label: "Avaliação", category: "input", icon: Star, description: "Entrada de avaliação", color: "orange" },
  { type: "file_input", label: "Arquivo", category: "input", icon: Upload, description: "Upload de arquivo", color: "orange" },

  // Logic
  { type: "set_variable", label: "Definir variável", category: "logic", icon: Variable, description: "Define o valor de uma variável", color: "purple" },
  { type: "if_else", label: "Condição", category: "logic", icon: GitBranch, description: "Condição com duas saídas", color: "purple", defaultConfig: { condition: "" } },
  { type: "redirect", label: "Redirecionar", category: "logic", icon: ExternalLink, description: "Redireciona para URL", color: "purple" },
  { type: "code_block", label: "Código", category: "logic", icon: Code, description: "Executa código customizado", color: "purple" },
  { type: "typebot_link", label: "Typebot", category: "logic", icon: Bot, description: "Link para outro fluxo", color: "purple" },
  { type: "delay", label: "Delay", category: "logic", icon: Timer, description: "Aguarda um tempo", color: "purple", defaultConfig: { seconds: 5 } },
  { type: "wait_response", label: "Aguardar Resposta", category: "logic", icon: Clock, description: "Aguarda resposta do cliente", color: "purple" },

  // Integrations
  { type: "webhook", label: "Webhook", category: "integration", icon: Webhook, description: "Envia/recebe webhook", color: "emerald" },
  { type: "search_vehicles", label: "Buscar Veículos", category: "integration", icon: Car, description: "Busca veículos disponíveis", color: "emerald" },
  { type: "search_customer", label: "Buscar Cliente", category: "integration", icon: Search, description: "Busca cliente no banco", color: "emerald" },
  { type: "create_customer", label: "Criar Cliente", category: "integration", icon: UserPlus, description: "Cadastra novo cliente", color: "emerald" },
  { type: "create_rental", label: "Criar Reserva", category: "integration", icon: CalendarPlus, description: "Cria uma reserva", color: "emerald" },
  { type: "update_rental", label: "Atualizar Reserva", category: "integration", icon: RefreshCw, description: "Atualiza reserva", color: "emerald" },
  { type: "register_payment", label: "Registrar Pagamento", category: "integration", icon: CreditCard, description: "Registra pagamento", color: "emerald" },
  { type: "save_history", label: "Salvar Histórico", category: "integration", icon: Save, description: "Salva histórico", color: "emerald" },
  { type: "transfer_human", label: "Transferir Humano", category: "integration", icon: Users, description: "Transfere para humano", color: "emerald" },
  { type: "end_session", label: "Encerrar", category: "integration", icon: XCircle, description: "Finaliza sessão", color: "emerald" },
  { type: "send_reminder", label: "Lembrete", category: "integration", icon: Bell, description: "Agenda lembrete", color: "emerald" },
  { type: "interpret_message", label: "Interpretar IA", category: "integration", icon: Brain, description: "Interpreta com IA", color: "emerald" },
  { type: "classify_intent", label: "Classificar Intenção", category: "integration", icon: Target, description: "Classifica intenção", color: "emerald" },
  { type: "natural_response", label: "Resposta IA", category: "integration", icon: Sparkles, description: "Gera resposta IA", color: "emerald" },
  { type: "suggest_next", label: "Sugerir Próximo", category: "integration", icon: Lightbulb, description: "Sugere próximo passo", color: "emerald" },
];

export function getNodeTypeConfig(type: string): NodeTypeConfig | undefined {
  return nodeTypes.find((n) => n.type === type);
}

export function getNodesByCategory(category: FlowNodeCategory): NodeTypeConfig[] {
  return nodeTypes.filter((n) => n.category === category);
}
