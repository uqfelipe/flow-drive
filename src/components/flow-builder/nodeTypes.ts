import type { LucideIcon } from "lucide-react";
import {
  MessageSquare, Link, QrCode, Copy, ListOrdered, SquareMousePointer, GalleryHorizontalEnd, BarChart3,
  Image, Mic, Video, File, Sticker, MapPin, Contact,
  Type, Hash, Mail, Calendar, Phone, User, CreditCard,
  GitBranch, Clock, Timer, Variable,
  Webhook, HeadphonesIcon, XCircle, Puzzle, List, MapPinned, DollarSign, Keyboard,
} from "lucide-react";
import type { FlowNodeCategory } from "@/types";

export interface NodeTypeConfig {
  type: string;
  label: string;
  category: FlowNodeCategory;
  icon: LucideIcon;
  description: string;
  color: string;
  defaultConfig?: Record<string, any>;
}

export interface NodeCategoryConfig {
  category: FlowNodeCategory;
  label: string;
  icon: LucideIcon;
}

export const nodeCategories: NodeCategoryConfig[] = [
  { category: "mensagem", label: "Mensagens", icon: MessageSquare },
  { category: "menu", label: "Menus", icon: ListOrdered },
  { category: "midia", label: "Mídia", icon: Image },
  { category: "entrada", label: "Entrada de Dados", icon: Type },
  { category: "logica", label: "Lógica", icon: GitBranch },
  { category: "integracao", label: "Integrações", icon: Puzzle },
];

export const nodeTypes: NodeTypeConfig[] = [
  // Mensagens
  { type: "message", label: "Mensagem", category: "mensagem", icon: MessageSquare, description: "Enviar mensagem de texto", color: "#8B5CF6", defaultConfig: { message: "" } },
  { type: "send_link", label: "Enviar Link", category: "mensagem", icon: Link, description: "Enviar link com preview", color: "#6366F1", defaultConfig: { url: "", linkPreviewTitle: "", linkPreviewDescription: "", linkPreviewImage: "" } },
  { type: "pix", label: "Pix (Copia e Cola)", category: "mensagem", icon: QrCode, description: "Enviar chave Pix", color: "#06B6D4", defaultConfig: { pixKey: "", pixType: "cpf", amount: "" } },
  { type: "copy_paste", label: "Copia e Cola", category: "mensagem", icon: Copy, description: "Texto para copiar", color: "#0EA5E9", defaultConfig: { text: "", message: "", label: "Copiar" } },

  // Menus
  { type: "menu_text", label: "Menu Texto", category: "menu", icon: ListOrdered, description: "Menu com opções numeradas", color: "#F97316", defaultConfig: { options: ["Opção 1", "Opção 2", "Opção 3"] } },
  { type: "menu_buttons", label: "Menu Botões", category: "menu", icon: SquareMousePointer, description: "Menu com botões interativos", color: "#3B82F6", defaultConfig: { buttons: [{ text: "Botão 1", type: "REPLY" }, { text: "Botão 2", type: "REPLY" }], imageButton: "" } },
  { type: "menu_list", label: "Menu Lista", category: "menu", icon: List, description: "Menu lista com seções", color: "#8B5CF6", defaultConfig: { listButton: "Ver opções", sections: [{ title: "Seção 1", items: [{ title: "Item 1", id: "1", description: "" }] }] } },
  { type: "menu_carousel", label: "Menu Carrossel", category: "menu", icon: GalleryHorizontalEnd, description: "Carrossel de cards", color: "#EC4899", defaultConfig: { cards: [{ text: "Card 1", image: "", buttons: [{ text: "Botão 1", type: "REPLY" }] }] } },
  { type: "poll", label: "Enquete", category: "menu", icon: BarChart3, description: "Criar enquete", color: "#14B8A6", defaultConfig: { question: "", options: ["Opção 1", "Opção 2"], selectableCount: 1 } },
  { type: "request_location", label: "Solicitar Localização", category: "menu", icon: MapPinned, description: "Botão para pedir localização", color: "#22C55E", defaultConfig: { message: "Compartilhe sua localização" } },

  // Mídia
  { type: "send_image", label: "Enviar Imagem", category: "midia", icon: Image, description: "Enviar foto ou imagem", color: "#10B981", defaultConfig: { file: "", caption: "" } },
  { type: "send_audio", label: "Enviar Áudio", category: "midia", icon: Mic, description: "Enviar mensagem de áudio", color: "#F59E0B", defaultConfig: { file: "" } },
  { type: "send_video", label: "Enviar Vídeo", category: "midia", icon: Video, description: "Enviar arquivo de vídeo", color: "#EF4444", defaultConfig: { file: "", caption: "" } },
  { type: "send_file", label: "Enviar Arquivo", category: "midia", icon: File, description: "Enviar documento", color: "#6366F1", defaultConfig: { file: "", caption: "" } },
  { type: "send_sticker", label: "Enviar Figurinha", category: "midia", icon: Sticker, description: "Enviar sticker", color: "#A855F7", defaultConfig: { file: "" } },
  { type: "send_location", label: "Enviar Localização", category: "midia", icon: MapPin, description: "Compartilhar localização", color: "#22C55E", defaultConfig: { latitude: "", longitude: "", name: "", address: "" } },
  { type: "contact_card", label: "Cartão de Contato", category: "midia", icon: Contact, description: "Enviar cartão de contato", color: "#0EA5E9", defaultConfig: { fullName: "", phoneNumber: "", organization: "", email: "" } },

  // Entrada de Dados
  { type: "capture_text", label: "Capturar Texto", category: "entrada", icon: Type, description: "Capturar texto livre", color: "#8B5CF6", defaultConfig: { variable: "", message: "" } },
  { type: "capture_number", label: "Capturar Número", category: "entrada", icon: Hash, description: "Capturar valor numérico", color: "#F97316", defaultConfig: { variable: "", message: "" } },
  { type: "capture_email", label: "Capturar Email", category: "entrada", icon: Mail, description: "Capturar endereço de email", color: "#3B82F6", defaultConfig: { variable: "", message: "" } },
  { type: "capture_date", label: "Capturar Data", category: "entrada", icon: Calendar, description: "Capturar uma data", color: "#14B8A6", defaultConfig: { variable: "", message: "" } },
  { type: "capture_phone", label: "Capturar Telefone", category: "entrada", icon: Phone, description: "Capturar número de telefone", color: "#10B981", defaultConfig: { variable: "", message: "" } },
  { type: "capture_name", label: "Capturar Nome", category: "entrada", icon: User, description: "Capturar nome completo", color: "#EC4899", defaultConfig: { variable: "", message: "" } },
  { type: "capture_cpf", label: "Capturar CPF", category: "entrada", icon: CreditCard, description: "Capturar CPF válido", color: "#EF4444", defaultConfig: { variable: "", message: "" } },

  // Lógica
  { type: "condition", label: "Condição", category: "logica", icon: GitBranch, description: "Desvio condicional", color: "#F59E0B", defaultConfig: { condition: "" } },
  { type: "wait", label: "Aguardar", category: "logica", icon: Clock, description: "Aguardar resposta do usuário", color: "#6366F1" },
  { type: "delay", label: "Delay", category: "logica", icon: Timer, description: "Aguardar tempo definido", color: "#0EA5E9", defaultConfig: { seconds: 5 } },
  { type: "set_variable", label: "Definir Variável", category: "logica", icon: Variable, description: "Atribuir valor a variável", color: "#8B5CF6", defaultConfig: { variable: "", value: "" } },
  { type: "typing_indicator", label: "Digitando...", category: "logica", icon: Keyboard, description: "Indicador digitando antes de responder", color: "#A855F7", defaultConfig: { seconds: 3 } },

  // Integrações
  { type: "webhook", label: "Webhook", category: "integracao", icon: Webhook, description: "Chamada HTTP externa", color: "#F97316", defaultConfig: { url: "", method: "POST" } },
  { type: "transfer_human", label: "Transferir p/ Humano", category: "integracao", icon: HeadphonesIcon, description: "Transferir para atendente", color: "#3B82F6" },
  { type: "end", label: "Encerramento", category: "integracao", icon: XCircle, description: "Encerrar conversa", color: "#EF4444" },
  { type: "integration", label: "Integração", category: "integracao", icon: Puzzle, description: "Integração externa", color: "#10B981", defaultConfig: { service: "" } },
  { type: "request_payment", label: "Solicitar Pagamento", category: "integracao", icon: DollarSign, description: "Pix, boleto ou link de pagamento", color: "#06B6D4", defaultConfig: { amount: "", pixKey: "", pixType: "cpf", paymentLink: "", boletoCode: "", message: "" } },
];

export function getNodeTypeConfig(type: string): NodeTypeConfig | undefined {
  return nodeTypes.find((n) => n.type === type);
}

export function getNodesByCategory(category: FlowNodeCategory): NodeTypeConfig[] {
  return nodeTypes.filter((n) => n.category === category);
}
