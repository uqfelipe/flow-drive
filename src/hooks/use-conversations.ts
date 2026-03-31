import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SessionRow {
  id: string;
  customer_id: string;
  flow_id: string | null;
  current_node_id: string | null;
  variables: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  customers: { name: string; phone: string } | null;
  chatbot_flows: { name: string } | null;
}

export function useChatSessions() {
  return useQuery({
    queryKey: ["chat_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*, customers(name, phone), chatbot_flows(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as SessionRow[];
    },
  });
}
