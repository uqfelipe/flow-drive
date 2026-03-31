import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function chatAction(action: string, extra?: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("whatsapp-chat", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message || "Erro na função");
  return data;
}

export interface WhatsAppChat {
  wa_chatid: string;
  wa_contactName?: string;
  wa_name?: string;
  name?: string;
  wa_lastMsgTimestamp?: number;
  wa_lastMsg?: string;
  wa_profilePicUrl?: string;
  wa_unreadCount?: number;
  image?: string;
  imagePreview?: string;
}

export interface WhatsAppMessage {
  id: string;
  chatid: string;
  content: string;
  fromMe: boolean;
  timestamp: number;
  type: string;
  status?: string;
}

export function useWhatsAppChats() {
  return useQuery<WhatsAppChat[]>({
    queryKey: ["whatsapp-chats"],
    queryFn: async () => {
      const data = await chatAction("list-chats");
      return data?.chats ?? [];
    },
    refetchInterval: 10000,
  });
}

export function useChatMessages(phone: string | null) {
  return useQuery<WhatsAppMessage[]>({
    queryKey: ["whatsapp-messages", phone],
    queryFn: async () => {
      if (!phone) return [];
      const data = await chatAction("fetch-messages", { phone });
      return (data?.messages ?? []).sort(
        (a: WhatsAppMessage, b: WhatsAppMessage) => a.timestamp - b.timestamp
      );
    },
    enabled: !!phone,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, text }: { phone: string; text: string }) => {
      return chatAction("send-text", { phone, text });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages", vars.phone] });
    },
  });
}
