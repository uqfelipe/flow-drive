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
      const raw = data?.messages ?? [];
      // Normalize API fields to our WhatsAppMessage interface
      const normalized: WhatsAppMessage[] = raw.map((msg: any) => {
        // Timestamp: API returns ms (13 digits) — convert to seconds
        let ts = msg.messageTimestamp ?? msg.timestamp ?? 0;
        if (ts > 9999999999999) ts = Math.floor(ts / 1000); // microseconds edge case
        else if (ts > 9999999999) ts = Math.floor(ts / 1000); // milliseconds
        // else already in seconds

        // Extract Meta AI response text from base64 if UnknownMessageType
        let extractedText = msg.text ?? "";
        const rawType = (msg.messageType ?? msg.type ?? "");
        if (rawType === "UnknownMessageType" && !extractedText) {
          try {
            const b64 = msg.content?.message?.protocolMessage?.editedMessage?.richResponseMessage?.unifiedResponse?.data;
            if (b64) {
              const json = JSON.parse(atob(b64));
              const texts = (json.sections ?? [])
                .map((s: any) => s?.view_model?.primitive?.text)
                .filter(Boolean);
              if (texts.length) extractedText = "🤖 " + texts.join("\n");
            }
          } catch { /* ignore decode errors */ }
          if (!extractedText) extractedText = "[mensagem não suportada]";
        }

        return {
          id: msg.id ?? msg.messageid ?? "",
          chatid: msg.chatid ?? "",
          content: msg.content,
          fromMe: msg.fromMe ?? false,
          timestamp: ts,
          type: rawType.toLowerCase(),
          status: (msg.status ?? "").toLowerCase(),
          fileURL: msg.fileURL ?? msg.fileUrl ?? "",
          text: extractedText,
        } as WhatsAppMessage & { text?: string };
      });
      return normalized.sort((a, b) => a.timestamp - b.timestamp);
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

export function useSendImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, imageUrl, text }: { phone: string; imageUrl: string; text?: string }) => {
      return chatAction("send-image", { phone, imageUrl, text: text || "" });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages", vars.phone] });
    },
  });
}
