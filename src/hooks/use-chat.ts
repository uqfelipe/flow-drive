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
  fileURL?: string;
}

export function useWhatsAppChats() {
  return useQuery<WhatsAppChat[]>({
    queryKey: ["whatsapp-chats"],
    queryFn: async () => {
      const data = await chatAction("list-chats");
      const chats = data?.chats ?? [];
      // Hide Meta AI contact
      return chats.filter((c: any) => {
        const chatId = c.wa_chatid ?? "";
        return !chatId.startsWith("13135550002");
      });
    },
    refetchInterval: 5000,
  });
}

export function useChatMessages(phone: string | null) {
  return useQuery<WhatsAppMessage[]>({
    queryKey: ["whatsapp-messages", phone],
    queryFn: async () => {
      if (!phone) return [];
      const data = await chatAction("fetch-messages", { phone });
      const raw = data?.messages ?? [];
      // Normalize API fields to our WhatsAppMessage interface
      const normalized: WhatsAppMessage[] = raw
        .filter((msg: any) => {
          // Filter out Meta AI messages (UnknownMessageType with no text)
          const rawType = (msg.messageType ?? msg.type ?? "");
          if (rawType === "UnknownMessageType") return false;
          return true;
        })
        .map((msg: any) => {
          // Timestamp: API returns ms (13 digits) — convert to seconds
          let ts = msg.messageTimestamp ?? msg.timestamp ?? 0;
          if (ts > 9999999999999) ts = Math.floor(ts / 1000);
          else if (ts > 9999999999) ts = Math.floor(ts / 1000);

          return {
            id: msg.id ?? msg.messageid ?? "",
            chatid: msg.chatid ?? "",
            content: msg.content,
            fromMe: msg.fromMe ?? false,
            timestamp: ts,
            type: (msg.messageType ?? msg.type ?? "").toLowerCase(),
            status: (msg.status ?? "").toLowerCase(),
            fileURL: msg.fileURL ?? msg.fileUrl ?? "",
            text: msg.text ?? "",
          } as WhatsAppMessage & { text?: string };
        });
      return normalized.sort((a, b) => a.timestamp - b.timestamp);
    },
    enabled: !!phone,
    refetchInterval: 2000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, text }: { phone: string; text: string }) => {
      return chatAction("send-text", { phone, text });
    },
    onMutate: async ({ phone, text }) => {
      await qc.cancelQueries({ queryKey: ["whatsapp-messages", phone] });
      const previous = qc.getQueryData<WhatsAppMessage[]>(["whatsapp-messages", phone]);
      const optimisticMsg: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        chatid: `${phone}@s.whatsapp.net`,
        content: text,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
        type: "text",
        status: "pending",
      };
      qc.setQueryData<WhatsAppMessage[]>(["whatsapp-messages", phone], (old) => [...(old || []), optimisticMsg]);
      return { previous };
    },
    onError: (_, vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["whatsapp-messages", vars.phone], context.previous);
      }
    },
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages", vars.phone] });
      qc.invalidateQueries({ queryKey: ["whatsapp-chats"] });
    },
  });
}

export function useSendImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, imageUrl, text }: { phone: string; imageUrl: string; text?: string }) => {
      return chatAction("send-image", { phone, imageUrl, text: text || "" });
    },
    onMutate: async ({ phone, imageUrl, text }) => {
      await qc.cancelQueries({ queryKey: ["whatsapp-messages", phone] });
      const previous = qc.getQueryData<WhatsAppMessage[]>(["whatsapp-messages", phone]);
      const optimisticMsg: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        chatid: `${phone}@s.whatsapp.net`,
        content: text || "",
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
        type: "image",
        status: "pending",
        fileURL: imageUrl,
      };
      qc.setQueryData<WhatsAppMessage[]>(["whatsapp-messages", phone], (old) => [...(old || []), optimisticMsg]);
      return { previous };
    },
    onError: (_, vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["whatsapp-messages", vars.phone], context.previous);
      }
    },
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages", vars.phone] });
      qc.invalidateQueries({ queryKey: ["whatsapp-chats"] });
    },
  });
}
