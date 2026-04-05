// Vehicle types
export type VehicleStatus = 'available' | 'reserved' | 'rented' | 'maintenance' | 'inactive';
export type VehicleCategory = 'sedan' | 'suv' | 'hatch' | 'pickup' | 'van' | 'luxury' | 'economy';

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  category: VehicleCategory;
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  description: string;
  status: VehicleStatus;
  images: string[];
  created_at: string;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  notes: string;
  status: 'active' | 'inactive';
  created_at: string;
}

// Rental types
export type RentalStatus = 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface Rental {
  id: string;
  vehicle_id: string;
  customer_id: string;
  pickup_date: string;
  return_date: string;
  total_value: number;
  rental_status: RentalStatus;
  payment_status: PaymentStatus;
  origin: 'manual' | 'chatbot';
  created_at: string;
  vehicle?: Vehicle;
  customer?: Customer;
}

export interface RentalPayment {
  id: string;
  rental_id: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  paid_at?: string;
  created_at: string;
}

// Chatbot Flow types
export type FlowNodeCategory = 'mensagem' | 'menu' | 'midia' | 'entrada' | 'logica';

export interface FlowBlock {
  id: string;
  type: string;
  label: string;
  category: FlowNodeCategory;
  config: Record<string, any>;
  description?: string;
}

export interface FlowNodeData {
  label: string;
  category: FlowNodeCategory;
  nodeType: string;
  config: Record<string, any>;
  description?: string;
  icon?: string;
  blocks?: FlowBlock[];
}

export interface ChatbotFlow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  version: number;
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

// WhatsApp
export interface WhatsAppInstance {
  id: string;
  name: string;
  base_url: string;
  api_token: string;
  webhook_url: string;
  status: 'connected' | 'disconnected' | 'connecting';
  created_at: string;
}

// Chat
export interface ChatMessage {
  id: string;
  session_id: string;
  customer_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  message_type: 'text' | 'image' | 'document' | 'list';
  created_at: string;
}

export interface ChatSession {
  id: string;
  customer_id: string;
  flow_id: string;
  current_node_id: string;
  variables: Record<string, any>;
  status: 'active' | 'completed' | 'waiting';
  created_at: string;
  customer?: Customer;
}

// Notification
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  created_at: string;
}
