export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          customer_id: string
          direction: string
          id: string
          message_type: string
          session_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          customer_id: string
          direction?: string
          id?: string
          message_type?: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_id?: string
          direction?: string
          id?: string
          message_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          current_node_id: string | null
          customer_id: string
          flow_id: string | null
          id: string
          status: Database["public"]["Enums"]["chat_session_status"]
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          current_node_id?: string | null
          customer_id: string
          flow_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["chat_session_status"]
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          current_node_id?: string | null
          customer_id?: string
          flow_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["chat_session_status"]
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_flows: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          id: string
          name: string
          nodes: Json
          status: Database["public"]["Enums"]["flow_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          status?: Database["public"]["Enums"]["flow_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          status?: Database["public"]["Enums"]["flow_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          cpf: string
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          paid_at: string | null
          rental_id: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          paid_at?: string | null
          rental_id: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          rental_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      rentals: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          origin: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_date: string
          rental_status: Database["public"]["Enums"]["rental_status"]
          return_date: string
          total_value: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          origin?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_date: string
          rental_status?: Database["public"]["Enums"]["rental_status"]
          return_date: string
          total_value?: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          origin?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_date?: string
          rental_status?: Database["public"]["Enums"]["rental_status"]
          return_date?: string
          total_value?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rentals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string
          category: Database["public"]["Enums"]["vehicle_category"]
          color: string
          created_at: string
          daily_rate: number
          description: string | null
          id: string
          images: string[] | null
          model: string
          monthly_rate: number
          name: string
          plate: string
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          weekly_rate: number
          year: number
        }
        Insert: {
          brand: string
          category?: Database["public"]["Enums"]["vehicle_category"]
          color?: string
          created_at?: string
          daily_rate?: number
          description?: string | null
          id?: string
          images?: string[] | null
          model: string
          monthly_rate?: number
          name: string
          plate: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          weekly_rate?: number
          year: number
        }
        Update: {
          brand?: string
          category?: Database["public"]["Enums"]["vehicle_category"]
          color?: string
          created_at?: string
          daily_rate?: number
          description?: string | null
          id?: string
          images?: string[] | null
          model?: string
          monthly_rate?: number
          name?: string
          plate?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          weekly_rate?: number
          year?: number
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          api_token: string
          base_url: string
          created_at: string
          id: string
          instance_name: string
          status: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at: string
          webhook_url: string
        }
        Insert: {
          api_token?: string
          base_url?: string
          created_at?: string
          id?: string
          instance_name?: string
          status?: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at?: string
          webhook_url?: string
        }
        Update: {
          api_token?: string
          base_url?: string
          created_at?: string
          id?: string
          instance_name?: string
          status?: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          device_name: string
          id: string
          instance_name: string
          instance_token: string
          is_connected: boolean
          last_connection_at: string | null
          server_url: string
          status: string
          token: string
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          device_name?: string
          id?: string
          instance_name: string
          instance_token: string
          is_connected?: boolean
          last_connection_at?: string | null
          server_url: string
          status?: string
          token: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          device_name?: string
          id?: string
          instance_name?: string
          instance_token?: string
          is_connected?: boolean
          last_connection_at?: string | null
          server_url?: string
          status?: string
          token?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      chat_session_status: "active" | "completed" | "waiting"
      flow_status: "active" | "inactive" | "draft"
      payment_status: "pending" | "paid" | "overdue"
      rental_status:
        | "pending"
        | "approved"
        | "active"
        | "completed"
        | "cancelled"
      vehicle_category:
        | "sedan"
        | "suv"
        | "hatch"
        | "pickup"
        | "van"
        | "luxury"
        | "economy"
      vehicle_status:
        | "available"
        | "reserved"
        | "rented"
        | "maintenance"
        | "inactive"
      whatsapp_connection_status: "connected" | "disconnected" | "connecting"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      chat_session_status: ["active", "completed", "waiting"],
      flow_status: ["active", "inactive", "draft"],
      payment_status: ["pending", "paid", "overdue"],
      rental_status: [
        "pending",
        "approved",
        "active",
        "completed",
        "cancelled",
      ],
      vehicle_category: [
        "sedan",
        "suv",
        "hatch",
        "pickup",
        "van",
        "luxury",
        "economy",
      ],
      vehicle_status: [
        "available",
        "reserved",
        "rented",
        "maintenance",
        "inactive",
      ],
      whatsapp_connection_status: ["connected", "disconnected", "connecting"],
    },
  },
} as const
